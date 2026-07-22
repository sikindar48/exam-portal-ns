import { apiClient } from "./api/client";

export interface RazorpayPaymentOptions {
  type: "plan" | "package";
  plan_id?: string;
  package_id?: string;
  customerName?: string;
  customerEmail?: string;
  onSuccess: (result: { type: string; plan_id?: string; purchase_id?: string }) => void;
  onFailure?: (error: string) => void;
}

export async function initiateRazorpayPayment(opts: RazorpayPaymentOptions): Promise<void> {
  const { type, plan_id, package_id, customerName, customerEmail, onSuccess, onFailure } = opts;

  let order: any;
  try {
    // 1. Create order on backend using apiClient (which attaches Firebase auth Bearer token)
    order = await apiClient("/payments/create-order", {
      method: "POST",
      body: { type, plan_id, package_id },
    });
  } catch (err: any) {
    onFailure?.(err.message || "Failed to create payment order");
    return;
  }

  if (!order || !order.order_id || !order.key_id) {
    onFailure?.("Invalid payment order response from server");
    return;
  }

  // 2. Open Razorpay checkout modal
  const rzp = new (window as any).Razorpay({
    key: order.key_id,
    amount: order.amount,
    currency: order.currency,
    order_id: order.order_id,
    name: "NS Exam Portal",
    description: order.description,
    prefill: {
      name: customerName || "",
      email: customerEmail || "",
    },
    theme: {
      color: "#4f46e5",
    },
    handler: async function (response: any) {
      try {
        // 3. Verify payment on backend using apiClient
        const verifyData = await apiClient("/payments/verify", {
          method: "POST",
          body: {
            razorpay_order_id: response.razorpay_order_id,
            razorpay_payment_id: response.razorpay_payment_id,
            razorpay_signature: response.razorpay_signature,
            payment_record_id: order.payment_record_id,
          },
        });

        if (verifyData && verifyData.success) {
          onSuccess(verifyData);
        } else {
          onFailure?.(verifyData?.error || "Payment verification failed");
        }
      } catch (err: any) {
        onFailure?.(err.message || "Payment verification failed");
      }
    },
    modal: {
      ondismiss: function () {
        onFailure?.("Payment cancelled");
      },
    },
  });

  rzp.on("payment.failed", function (response: any) {
    onFailure?.(response.error?.description || "Payment failed");
  });

  rzp.open();
}
