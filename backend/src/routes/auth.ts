import type { Request, Response } from "express";
import { getDb } from "../db/db.js";
import { getAuth } from "firebase-admin/auth";
import nodemailer from "nodemailer";
import crypto from "crypto";

export default async function handler(req: Request, res: Response) {
  const db = getDb();

  // ── POST /api/auth/forgot-password ──────────────────────────────────────────
  if (req.method === "POST" && req.path.endsWith("/forgot-password")) {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ error: "Email is required" });
    }

    try {
      const emailTrimmed = email.trim().toLowerCase();

      // Check if user exists in the local profiles database
      const { rows: profileRows } = await db.execute({
        sql: "SELECT id FROM profiles WHERE email = ?",
        args: [emailTrimmed],
      });

      if (profileRows.length === 0) {
        // Return 200/Success anyway for security reasons (prevents email enumeration attacks)
        return res.status(200).json({ success: true, message: "If the email is registered, a reset link will be sent." });
      }

      // Generate a secure token and set expiration to 1 hour
      const token = crypto.randomBytes(32).toString("hex");
      const expiresAt = Date.now() + 60 * 60 * 1000;

      // Upsert token in database
      await db.execute({
        sql: `INSERT INTO password_reset_tokens (email, token, expires_at)
              VALUES (?, ?, ?)
              ON CONFLICT(email) DO UPDATE SET
                token = excluded.token,
                expires_at = excluded.expires_at`,
        args: [emailTrimmed, token, expiresAt],
      });

      // Construct Reset Link
      const origin = process.env.FRONTEND_URL || req.headers.origin || "https://test.nssoftwaresolutions.in";
      const resetLink = `${origin.replace(/\/$/, "")}/reset-password?token=${token}`;

      // Set up Zepto Mail SMTP Transport
      const transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST || "smtp.zeptomail.in",
        port: parseInt(process.env.SMTP_PORT || "587"),
        auth: {
          user: process.env.SMTP_USER || "emailapikey",
          pass: process.env.SMTP_PASS || "",
        },
      });

      // Send the email
      const fromAddress = process.env.SMTP_FROM || '"NS Software Solutions" <noreply@nssoftwaresolutions.in>';
      await transporter.sendMail({
        from: fromAddress,
        to: emailTrimmed,
        subject: "NS Exam Portal - Reset Your Password",
        html: `
          <!DOCTYPE html>
          <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Reset Your Password</title>
          </head>
          <body style="margin: 0; padding: 0; background-color: #f8fafc; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; -webkit-font-smoothing: antialiased;">
            <div style="max-width: 600px; margin: 40px auto; padding: 40px; background-color: #ffffff; border-radius: 12px; box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05); border: 1px solid #e2e8f0; box-sizing: border-box;">
              
              <!-- Brand Header -->
              <div style="text-align: center; margin-bottom: 40px;">
                <h2 style="font-size: 24px; font-weight: 800; color: #0f172a; margin: 0; letter-spacing: -0.025em; font-family: inherit;">
                  NS <span style="color: #4f46e5;">Exam Portal</span>
                </h2>
                <div style="width: 60px; height: 3px; background: linear-gradient(90deg, #4f46e5, #3b82f6); margin: 12px auto 0 auto; border-radius: 2px;"></div>
              </div>

              <!-- Greeting -->
              <p style="color: #1e293b; font-size: 16px; font-weight: 600; line-height: 1.6; margin-top: 0; margin-bottom: 16px; font-family: inherit;">
                Hello,
              </p>

              <!-- Description -->
              <p style="color: #475569; font-size: 14px; line-height: 1.7; margin-bottom: 32px; font-family: inherit;">
                We received a request to reset the password associated with your account on the NS Exam Portal. Click the button below to choose a secure new password. This link is valid for <strong>1 hour</strong>.
              </p>

              <!-- Action Button -->
              <div style="text-align: center; margin: 36px 0;">
                <a href="${resetLink}" target="_blank" style="background: linear-gradient(135deg, #4f46e5 0%, #3b82f6 100%); color: #ffffff; padding: 14px 32px; font-size: 16px; font-weight: 600; text-decoration: none; border-radius: 8px; display: inline-block; box-shadow: 0 4px 12px rgba(79, 70, 229, 0.25); font-family: inherit;">
                  Reset Password
                </a>
              </div>

              <!-- Security Notice Box -->
              <div style="background-color: #f8fafc; border-left: 4px solid #4f46e5; padding: 16px 20px; border-radius: 0 8px 8px 0; margin: 32px 0;">
                <p style="color: #64748b; font-size: 14px; line-height: 1.6; margin: 0; font-family: inherit;">
                  <strong>Security Notice:</strong> If you did not request this change, please ignore this email. Your current password remains perfectly secure.
                </p>
              </div>

              <hr style="border: 0; border-top: 1px solid #e2e8f0; margin-bottom: 24px;">

              <!-- Direct Link -->
              <p style="font-size: 13px; line-height: 1.6; color: #94a3b8; margin: 0; word-break: break-all; font-family: inherit;">
                If the button above doesn't work, copy and paste this URL into your browser:<br>
                <a href="${resetLink}" target="_blank" style="color: #4f46e5; text-decoration: none; font-weight: 500;">${resetLink}</a>
              </p>

              <!-- Footer -->
              <div style="text-align: center; margin-top: 40px; padding-top: 20px; border-top: 1px solid #f1f5f9;">
                <p style="font-size: 12px; color: #94a3b8; margin: 0; font-family: inherit;">
                  &copy; ${new Date().getFullYear()} NS Software Solutions. All rights reserved.
                </p>
              </div>
            </div>
          </body>
          </html>
        `,
      });

      return res.status(200).json({ success: true, message: "If the email is registered, a reset link will be sent." });
    } catch (err: any) {
      console.error("Forgot password error:", err);
      return res.status(500).json({ error: "Failed to process forgot password request." });
    }
  }

  // ── POST /api/auth/reset-password ──────────────────────────────────────────
  if (req.method === "POST" && req.path.endsWith("/reset-password")) {
    const { token, password } = req.body;
    if (!token || !password) {
      return res.status(400).json({ error: "Token and password are required" });
    }

    if (password.length < 6) {
      return res.status(400).json({ error: "Password must be at least 6 characters" });
    }

    try {
      // Find the token in the database
      const { rows: tokenRows } = await db.execute({
        sql: "SELECT email, expires_at FROM password_reset_tokens WHERE token = ?",
        args: [token],
      });

      if (tokenRows.length === 0) {
        return res.status(400).json({ error: "Invalid or expired reset token." });
      }

      const row = tokenRows[0] as any;
      const email = row.email;
      const expiresAt = parseInt(row.expires_at);

      // Check expiry
      if (Date.now() > expiresAt) {
        await db.execute({
          sql: "DELETE FROM password_reset_tokens WHERE token = ?",
          args: [token],
        });
        return res.status(400).json({ error: "Invalid or expired reset token." });
      }

      // Update password in Firebase Auth using the Admin SDK
      const userRecord = await getAuth().getUserByEmail(email);
      await getAuth().updateUser(userRecord.uid, { password });

      // Clean up verification token from database
      await db.execute({
        sql: "DELETE FROM password_reset_tokens WHERE email = ?",
        args: [email],
      });

      return res.status(200).json({ success: true, message: "Password updated successfully." });
    } catch (err: any) {
      console.error("Reset password error:", err);
      return res.status(500).json({ error: err.message || "Failed to update password." });
    }
  }

  return res.status(405).json({ error: "Method not allowed" });
}
