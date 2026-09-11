import nodemailer from 'nodemailer';
import { Resend } from 'resend';

const resendApiKey = process.env.RESEND_API_KEY;
const resendFromEmail = process.env.RESEND_FROM_EMAIL || 'SubTrack <onboarding@resend.dev>';

// Gmail SMTP Credentials
const gmailUser = process.env.GMAIL_USER || process.env.SMTP_USER;
const gmailPass = (process.env.GMAIL_APP_PASSWORD || process.env.SMTP_PASS)?.replace(/\s+/g, '');

/**
 * Universal email dispatcher supporting:
 * 1. Gmail SMTP (via Google App Password) -> Delivers to ANY email without domain restrictions
 * 2. Resend API -> Fallback or production provider
 */
export async function sendEmail({
  to,
  subject,
  html,
}: {
  to: string;
  subject: string;
  html: string;
}): Promise<{ success: boolean; id?: string; error?: string }> {
  // Option 1: Gmail SMTP (Nodemailer)
  if (gmailUser && gmailPass) {
    try {
      const transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
          user: gmailUser,
          pass: gmailPass,
        },
      });

      const info = await transporter.sendMail({
        from: `SubTrack <${gmailUser}>`,
        to,
        subject,
        html,
      });

      console.log(`[Email:Gmail] Successfully delivered email to ${to} (id: ${info.messageId})`);
      return { success: true, id: info.messageId };
    } catch (err: unknown) {
      console.error('[Email:Gmail] SMTP transmission failed:', err);
      const msg = err instanceof Error ? err.message : 'Gmail SMTP sending failed';
      return { success: false, error: `Gmail SMTP error: ${msg}` };
    }
  }

  // Option 2: Resend API
  if (resendApiKey) {
    try {
      const resend = new Resend(resendApiKey);
      const data = await resend.emails.send({
        from: resendFromEmail,
        to: [to],
        subject,
        html,
      });

      if (data.error) {
        console.error('Resend email error:', data.error);
        const resendErr = data.error as { statusCode?: number; message?: string; name?: string };
        const isDomainRestriction =
          resendErr.statusCode === 403 ||
          resendErr.message?.includes('only send testing emails to your own email address') ||
          resendErr.name === 'validation_error';

        if (isDomainRestriction) {
          return {
            success: false,
            error:
              "Resend Sandbox Restriction: 'onboarding@resend.dev' can only deliver emails to the account owner (nishukhandelwal012@gmail.com). Configure GMAIL_USER and GMAIL_APP_PASSWORD in .env.local to send to any recipient.",
          };
        }

        return { success: false, error: data.error.message };
      }

      console.log(`[Email:Resend] Successfully sent email to ${to} (id: ${data.data?.id})`);
      return { success: true, id: data.data?.id };
    } catch (err: unknown) {
      console.error('Failed to send email via Resend:', err);
      return {
        success: false,
        error: err instanceof Error ? err.message : 'Failed to send email via Resend.',
      };
    }
  }

  console.warn('Neither Gmail SMTP (GMAIL_USER / GMAIL_APP_PASSWORD) nor RESEND_API_KEY is configured.');
  return { success: false, error: 'Email service is not configured in .env.local.' };
}

/**
 * Send branded 6-digit verification code email for signup OTP
 */
export async function sendOtpEmail({
  to,
  fullName,
  otpCode,
}: {
  to: string;
  fullName: string;
  otpCode: string;
}) {
  const htmlContent = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <title>SubTrack Verification Code</title>
      </head>
      <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f7f7f3; padding: 40px 20px; color: #20211d; margin: 0;">
        <table align="center" border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 520px; background-color: #ffffff; border-radius: 16px; border: 1px solid #e7e5e4; padding: 36px 32px; box-shadow: 0 4px 20px rgba(0,0,0,0.05);">
          <tr>
            <td style="padding-bottom: 24px; border-bottom: 1px solid #f5f5f4;">
              <span style="font-size: 22px; font-weight: 800; color: #20211d; letter-spacing: -0.5px;">
                Sub<span style="color: #6154d9;">Track</span>
              </span>
            </td>
          </tr>
          <tr>
            <td style="padding-top: 28px;">
              <h1 style="font-size: 20px; font-weight: 700; color: #20211d; margin: 0 0 12px 0;">Verify your email address</h1>
              <p style="font-size: 14px; line-height: 22px; color: #57534e; margin: 0 0 24px 0;">
                Hi ${fullName || 'there'},<br>
                Thank you for joining SubTrack! Please use the one-time security code below to complete your account setup.
              </p>
              <div style="background-color: #f5f5f4; border-radius: 12px; padding: 20px; text-align: center; margin: 0 0 24px 0; border: 1px dashed #d6d3d1;">
                <span style="font-family: 'Courier New', Courier, monospace; font-size: 32px; font-weight: 800; letter-spacing: 8px; color: #20211d; display: inline-block;">
                  ${otpCode}
                </span>
              </div>
              <p style="font-size: 13px; line-height: 20px; color: #78716c; margin: 0 0 16px 0;">
                ⏱️ <b>This code is valid for 10 minutes only.</b> If you did not request this, please ignore this email.
              </p>
            </td>
          </tr>
          <tr>
            <td style="padding-top: 24px; border-top: 1px solid #f5f5f4; font-size: 11px; color: #a8a29e; text-align: center;">
              SubTrack · Keep track of every subscription calmly.
            </td>
          </tr>
        </table>
      </body>
    </html>
  `;

  return sendEmail({
    to,
    subject: `${otpCode} is your SubTrack verification code`,
    html: htmlContent,
  });
}
