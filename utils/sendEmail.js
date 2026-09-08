import nodemailer from "nodemailer";
import { Resend } from "resend";

/**
 * Creates Nodemailer Transporter for Gmail SMTP
 */
const getTransporter = () => {
  if (process.env.EMAIL_USER && process.env.EMAIL_PASS) {
    return nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });
  }
  return null;
};

/**
 * Helper to get fresh Resend client
 */
const getResendClient = () => {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    return null;
  }
  return new Resend(apiKey);
};

/**
 * Central email sending helper.
 * Tries Nodemailer (Gmail SMTP) first as it supports sending to any email address.
 * Falls back to Resend API if Nodemailer is unavailable or fails.
 */
export const sendEmail = async ({ to, subject, text, html }) => {
  let nodemailerError = null;

  // 1. Try Nodemailer (Gmail SMTP) first
  const transporter = getTransporter();
  if (transporter) {
    try {
      const fromAddress = `"G-Lab" <${process.env.EMAIL_USER}>`;
      const info = await transporter.sendMail({
        from: fromAddress,
        to,
        subject,
        text,
        html: html || text,
      });
      console.log(`✅ [EMAIL] Sent via Nodemailer to ${to} (MessageID: ${info.messageId})`);
      return { success: true, provider: "nodemailer", id: info.messageId };
    } catch (err) {
      console.error("⚠️ [EMAIL] Nodemailer failed, attempting Resend fallback:", err.message);
      nodemailerError = err;
    }
  }

  // 2. Fallback to Resend API
  const resend = getResendClient();
  if (resend) {
    try {
      const from = process.env.RESEND_FROM_EMAIL || "G-Lab <onboarding@resend.dev>";
      const payload = {
        from,
        to,
        subject,
        text,
      };
      if (html) payload.html = html;

      const { data, error } = await resend.emails.send(payload);

      if (error) {
        console.error("❌ [EMAIL] Resend API error:", error);
        throw new Error(error.message || "Failed to send email via Resend");
      }

      console.log(`✅ [EMAIL] Sent via Resend to ${to} (ID: ${data?.id})`);
      return { success: true, provider: "resend", id: data?.id };
    } catch (err) {
      console.error("❌ [EMAIL] Resend failed:", err.message);
      throw err;
    }
  }

  throw nodemailerError || new Error("No email service configured (Missing Nodemailer and Resend credentials).");
};

/**
 * Helper to generate modern HTML email template for OTP
 */
export const generateOtpEmailHtml = (title, code, description) => {
  return `
    <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 500px; margin: 0 auto; padding: 20px; border-radius: 12px; background-color: #f8fafc; color: #1e293b; border: 1px solid #e2e8f0;">
      <div style="text-align: center; margin-bottom: 24px;">
        <h2 style="color: #0f172a; margin: 0; font-size: 24px; font-weight: 700; letter-spacing: -0.5px;">G-Lab</h2>
        <p style="color: #64748b; font-size: 14px; margin-top: 4px;">Verification Service</p>
      </div>
      
      <div style="background-color: #ffffff; padding: 28px; border-radius: 8px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); text-align: center;">
        <h3 style="margin-top: 0; color: #334155; font-size: 18px;">${title}</h3>
        <p style="color: #64748b; font-size: 14px; line-height: 1.5;">${description}</p>
        
        <div style="margin: 28px 0; background-color: #f1f5f9; border: 2px dashed #cbd5e1; border-radius: 8px; padding: 16px;">
          <span style="font-family: monospace; font-size: 32px; font-weight: 800; letter-spacing: 8px; color: #0284c7; display: inline-block;">${code}</span>
        </div>
        
        <p style="color: #94a3b8; font-size: 12px; margin-bottom: 0;">This code is valid for 10 minutes. Do not share this code with anyone.</p>
      </div>
      
      <div style="text-align: center; margin-top: 20px; color: #94a3b8; font-size: 12px;">
        &copy; ${new Date().getFullYear()} G-Lab. All rights reserved.
      </div>
    </div>
  `;
};
