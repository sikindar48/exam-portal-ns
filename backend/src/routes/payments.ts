import type { Request, Response } from "express";
import { getDb } from "../db/db.js";
import { requireUser } from "../auth/auth.js";
import { hasRole, getUserClientId } from "../services/roles.js";
import { getRazorpay, verifyPaymentSignature, verifyWebhookSignature } from "../services/razorpay.js";
import { randomUUID } from "crypto";

// ── Shared provisioning helpers ──────────────────────────────────────────────

/** Activate a subscription plan for a client (same logic as subscriptions.ts PUT) */
async function provisionPlanForClient(
  db: ReturnType<typeof getDb>,
  clientId: string,
  planId: string,
  changedBy: string
) {
  // Get current sub
  const { rows: currentSub } = await db.execute({
    sql: "SELECT plan_id FROM client_subscriptions WHERE client_id = ?",
    args: [clientId],
  });
  const oldPlanId = (currentSub[0] as any)?.plan_id || null;
  const todayStr = new Date().toISOString().slice(0, 10);
  const expiryStr = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

  // Upsert subscription
  await db.execute({
    sql: `INSERT INTO client_subscriptions (client_id, plan_id, start_date, expiry_date, status, renewal_status, updated_at)
          VALUES (?, ?, ?, ?, 'active', 'manual', CURRENT_TIMESTAMP)
          ON CONFLICT(client_id) DO UPDATE SET
            plan_id = ?,
            expiry_date = ?,
            status = 'active',
            updated_at = CURRENT_TIMESTAMP`,
    args: [clientId, planId, todayStr, expiryStr, planId, expiryStr],
  });

  // Write history
  if (oldPlanId !== planId) {
    await db.execute({
      sql: `INSERT INTO subscription_history (id, client_id, old_plan_id, new_plan_id, changed_by)
            VALUES (?, ?, ?, ?, ?)`,
      args: [randomUUID(), clientId, oldPlanId, planId, changedBy],
    });
  }

  // Sync limits
  const { rows: planLimits } = await db.execute({
    sql: "SELECT max_exams_per_month, max_students_per_exam, max_questions_per_exam FROM subscription_plans WHERE id = ?",
    args: [planId],
  });
  if (planLimits.length > 0) {
    const pl = planLimits[0] as any;
    await db.execute({
      sql: `INSERT INTO client_limits (client_id, max_exams_per_month, max_students_per_exam, max_questions_per_exam, updated_at)
            VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)
            ON CONFLICT(client_id) DO UPDATE SET
              max_exams_per_month = ?,
              max_students_per_exam = ?,
              max_questions_per_exam = ?,
              updated_at = CURRENT_TIMESTAMP`,
      args: [
        clientId,
        pl.max_exams_per_month, pl.max_students_per_exam, pl.max_questions_per_exam,
        pl.max_exams_per_month, pl.max_students_per_exam, pl.max_questions_per_exam,
      ],
    });
  }

  // Sync features
  const { rows: planFeatures } = await db.execute({
    sql: "SELECT feature_name FROM subscription_plan_features WHERE plan_id = ?",
    args: [planId],
  });
  await db.execute({ sql: "DELETE FROM client_features WHERE client_id = ?", args: [clientId] });
  for (const row of planFeatures) {
    await db.execute({
      sql: "INSERT OR IGNORE INTO client_features (id, client_id, feature_name, enabled) VALUES (?, ?, ?, 1)",
      args: [randomUUID(), clientId, (row as any).feature_name],
    });
  }

  // Audit
  await db.execute({
    sql: `INSERT INTO audit_logs (id, user_id, action, entity_type, entity_id, metadata)
          VALUES (?, ?, ?, 'client_subscription', ?, ?)`,
    args: [
      randomUUID(), changedBy,
      `Razorpay payment: upgraded to plan ${planId}`,
      clientId,
      JSON.stringify({ planId, oldPlanId }),
    ],
  });
}

/** Mark a package purchase as "available" after payment */
async function provisionPackageForClient(
  db: ReturnType<typeof getDb>,
  clientId: string,
  packageId: string,
  razorpayOrderId: string,
  paymentRecordId: string
): Promise<string> {
  const purchaseId = randomUUID();
  await db.execute({
    sql: `INSERT INTO client_test_purchases
            (id, client_id, package_id, status, razorpay_order_id)
          VALUES (?, ?, ?, 'available', ?)`,
    args: [purchaseId, clientId, packageId, razorpayOrderId],
  });
  // Link purchase_id back to the razorpay_payments record
  await db.execute({
    sql: "UPDATE razorpay_payments SET purchase_id = ? WHERE id = ?",
    args: [purchaseId, paymentRecordId],
  });
  return purchaseId;
}

// ── Route handler ─────────────────────────────────────────────────────────────

export default async function handler(req: Request, res: Response) {
  const db = getDb();
  const path = req.path;

  // ── POST /api/payments/create-order ────────────────────────────────────────
  if (req.method === "POST" && path.endsWith("/create-order")) {
    const user = await requireUser(req, res);
    if (!user) return;

    const isClientAdmin = await hasRole(user.id, "clientadmin");
    const isSuper = await hasRole(user.id, "superadmin");
    if (!isClientAdmin && !isSuper) {
      return res.status(403).json({ error: "Permission denied" });
    }

    const clientId = isSuper && req.body.client_id
      ? req.body.client_id
      : await getUserClientId(user.id);

    if (!clientId) return res.status(400).json({ error: "No client organization found" });

    const { type, plan_id, package_id } = req.body;

    if (!type || !["plan", "package"].includes(type)) {
      return res.status(400).json({ error: "type must be 'plan' or 'package'" });
    }

    try {
      const rzp = getRazorpay();
      let amountInPaise = 0;
      let description = "";
      let metadata: Record<string, any> = {};

      if (type === "plan") {
        if (!plan_id) return res.status(400).json({ error: "plan_id is required for plan payments" });
        const { rows: planRows } = await db.execute({
          sql: "SELECT id, name, price_inr FROM subscription_plans WHERE id = ?",
          args: [plan_id],
        });
        if (!planRows.length) return res.status(404).json({ error: "Plan not found" });
        const plan = planRows[0] as any;
        if (plan.id === "free") return res.status(400).json({ error: "Free plan requires no payment" });
        amountInPaise = Number(plan.price_inr) * 100;
        if (amountInPaise <= 0) return res.status(400).json({ error: "Plan price not configured. Ask superadmin to set a price." });
        description = `${plan.name} Subscription (1 Year)`;
        metadata = { plan_id };
      } else {
        if (!package_id) return res.status(400).json({ error: "package_id is required for package payments" });
        const { rows: pkgRows } = await db.execute({
          sql: "SELECT id, name, price FROM test_packages WHERE id = ? AND active = 1",
          args: [package_id],
        });
        if (!pkgRows.length) return res.status(404).json({ error: "Package not found" });
        const pkg = pkgRows[0] as any;
        amountInPaise = Math.round(Number(pkg.price) * 100);
        description = `${pkg.name} — Pay Per Test Package`;
        metadata = { package_id };
      }

      // Create Razorpay order
      const order = await rzp.orders.create({
        amount: amountInPaise,
        currency: "INR",
        receipt: `rcpt_${randomUUID().slice(0, 12)}`,
        notes: { client_id: clientId, type, ...metadata },
      });

      // Save pending record
      const paymentId = randomUUID();
      await db.execute({
        sql: `INSERT INTO razorpay_payments
                (id, client_id, razorpay_order_id, type, plan_id, package_id, amount, currency, status, metadata)
              VALUES (?, ?, ?, ?, ?, ?, ?, 'INR', 'created', ?)`,
        args: [
          paymentId,
          clientId,
          order.id,
          type,
          (type === "plan" ? plan_id : null),
          (type === "package" ? package_id : null),
          amountInPaise,
          JSON.stringify(metadata),
        ],
      });

      return res.status(200).json({
        order_id: order.id,
        amount: amountInPaise,
        currency: "INR",
        key_id: process.env.RAZORPAY_KEY_ID,
        description,
        payment_record_id: paymentId,
      });
    } catch (err: any) {
      console.error("Razorpay create-order error:", err);
      return res.status(500).json({ error: err.message || "Failed to create payment order" });
    }
  }

  // ── POST /api/payments/verify ───────────────────────────────────────────────
  if (req.method === "POST" && path.endsWith("/verify")) {
    const user = await requireUser(req, res);
    if (!user) return;

    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
      payment_record_id,
    } = req.body;

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return res.status(400).json({ error: "razorpay_order_id, razorpay_payment_id, and razorpay_signature are required" });
    }

    // Verify HMAC signature
    const isValid = verifyPaymentSignature(razorpay_order_id, razorpay_payment_id, razorpay_signature);
    if (!isValid) {
      return res.status(400).json({ error: "Invalid payment signature. Payment could not be verified." });
    }

    try {
      // Fetch the pending payment record
      const { rows: payRows } = await db.execute({
        sql: "SELECT * FROM razorpay_payments WHERE razorpay_order_id = ?",
        args: [razorpay_order_id],
      });
      if (!payRows.length) return res.status(404).json({ error: "Payment record not found" });

      const pay = payRows[0] as any;

      // Idempotency check: already paid
      if (pay.status === "paid") {
        return res.status(200).json({ success: true, already_processed: true });
      }

      // Mark payment as paid
      await db.execute({
        sql: `UPDATE razorpay_payments
              SET status = 'paid', razorpay_payment_id = ?, paid_at = CURRENT_TIMESTAMP
              WHERE id = ?`,
        args: [razorpay_payment_id, pay.id],
      });

      // Provision based on payment type
      if (pay.type === "plan") {
        await provisionPlanForClient(db, pay.client_id, pay.plan_id, user.id);
        return res.status(200).json({ success: true, type: "plan", plan_id: pay.plan_id });
      } else {
        const purchaseId = await provisionPackageForClient(db, pay.client_id, pay.package_id, razorpay_order_id, pay.id);
        return res.status(200).json({ success: true, type: "package", purchase_id: purchaseId });
      }
    } catch (err: any) {
      console.error("Razorpay verify error:", err);
      return res.status(500).json({ error: err.message || "Failed to process payment" });
    }
  }

  // ── POST /api/payments/webhook ──────────────────────────────────────────────
  // NOTE: This route uses raw body — registered separately in server.ts with express.raw()
  if (req.method === "POST" && path.endsWith("/webhook")) {
    const signature = req.headers["x-razorpay-signature"] as string;
    if (!signature) return res.status(400).json({ error: "Missing signature" });

    const rawBody = req.body; // Buffer (from express.raw middleware)
    const isValid = verifyWebhookSignature(rawBody, signature);
    if (!isValid) {
      console.warn("Razorpay webhook: invalid signature");
      return res.status(400).json({ error: "Invalid webhook signature" });
    }

    let event: any;
    try {
      event = JSON.parse(rawBody.toString());
    } catch {
      return res.status(400).json({ error: "Invalid JSON body" });
    }

    const eventName = event.event;
    console.log(`Razorpay webhook received: ${eventName}`);

    if (eventName === "payment.captured") {
      const payment = event.payload?.payment?.entity;
      if (!payment) return res.status(200).json({ status: "ignored" });

      const orderId = payment.order_id;
      const paymentId = payment.id;

      try {
        // Find the pending record
        const { rows: payRows } = await db.execute({
          sql: "SELECT * FROM razorpay_payments WHERE razorpay_order_id = ?",
          args: [orderId],
        });
        if (!payRows.length) {
          console.warn(`Webhook: no payment record for order ${orderId}`);
          return res.status(200).json({ status: "not_found" });
        }

        const pay = payRows[0] as any;

        // Idempotency: skip if already processed
        if (pay.status === "paid") {
          return res.status(200).json({ status: "already_processed" });
        }

        // Mark as paid
        await db.execute({
          sql: `UPDATE razorpay_payments
                SET status = 'paid', razorpay_payment_id = ?, paid_at = CURRENT_TIMESTAMP
                WHERE id = ?`,
          args: [paymentId, pay.id],
        });

        // Provision
        if (pay.type === "plan") {
          await provisionPlanForClient(db, pay.client_id, pay.plan_id, "razorpay_webhook");
        } else {
          await provisionPackageForClient(db, pay.client_id, pay.package_id, orderId, pay.id);
        }

        console.log(`Webhook: provisioned ${pay.type} for client ${pay.client_id}`);
        return res.status(200).json({ status: "ok" });
      } catch (err: any) {
        console.error("Webhook provisioning error:", err);
        return res.status(500).json({ error: "Internal provisioning error" });
      }
    }

    // Acknowledge all other events
    return res.status(200).json({ status: "ignored", event: eventName });
  }

  // ── GET /api/payments (SuperAdmin: list all payments with stats) ────────────
  if (req.method === "GET" && path.endsWith("/payments")) {
    const user = await requireUser(req, res);
    if (!user) return;

    const isSuper = await hasRole(user.id, "superadmin");
    if (!isSuper) return res.status(403).json({ error: "Superadmin only" });

    try {
      const [paymentsResult, statsResult] = await Promise.all([
        db.execute(`
          SELECT
            rp.*,
            c.name as client_name,
            sp.name as plan_name
          FROM razorpay_payments rp
          JOIN clients c ON c.id = rp.client_id
          LEFT JOIN subscription_plans sp ON sp.id = rp.plan_id
          ORDER BY rp.created_at DESC
          LIMIT 200
        `),
        db.execute(`
          SELECT
            COUNT(*) as total_orders,
            SUM(CASE WHEN status = 'paid' THEN 1 ELSE 0 END) as paid_count,
            SUM(CASE WHEN status = 'created' THEN 1 ELSE 0 END) as pending_count,
            SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END) as failed_count,
            SUM(CASE WHEN status = 'paid' THEN amount ELSE 0 END) as total_revenue_paise,
            SUM(CASE WHEN status = 'paid' AND type = 'plan' THEN amount ELSE 0 END) as plan_revenue_paise,
            SUM(CASE WHEN status = 'paid' AND type = 'package' THEN amount ELSE 0 END) as package_revenue_paise
          FROM razorpay_payments
        `),
      ]);

      const stats = statsResult.rows[0] as any;

      return res.status(200).json({
        payments: paymentsResult.rows,
        stats: {
          totalOrders: Number(stats.total_orders || 0),
          paidCount: Number(stats.paid_count || 0),
          pendingCount: Number(stats.pending_count || 0),
          failedCount: Number(stats.failed_count || 0),
          totalRevenueInr: Number(stats.total_revenue_paise || 0) / 100,
          planRevenueInr: Number(stats.plan_revenue_paise || 0) / 100,
          packageRevenueInr: Number(stats.package_revenue_paise || 0) / 100,
        },
      });
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  }

  return res.status(405).json({ error: "Method not allowed" });
}
