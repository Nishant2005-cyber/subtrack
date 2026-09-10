import { Resend } from 'resend';

const resendApiKey = process.env.RESEND_API_KEY;
const resendFromEmail = process.env.RESEND_FROM_EMAIL || 'SubTrack <onboarding@resend.dev>';

export async function sendOtpEmail({
  to,
  fullName,
  otpCode,
}: {
  to: string;
  fullName: string;
  otpCode: string;
}) {
  if (!resendApiKey) {
    console.warn('RESEND_API_KEY is not configured in .env.local');
    return { success: false, error: 'Email service is not configured.' };
  }

  try {
    const resend = new Resend(resendApiKey);

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

    const data = await resend.emails.send({
      from: resendFromEmail,
      to: [to],
      subject: `${otpCode} is your SubTrack verification code`,
      html: htmlContent,
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
            "Resend Sandbox Restriction: 'onboarding@resend.dev' can only deliver emails to the account owner (nishukhandelwal012@gmail.com). To receive emails at other addresses, verify a custom domain at resend.com/domains.",
        };
      }


      return { success: false, error: data.error.message };
    }

    return { success: true, id: data.data?.id };
  } catch (err) {
    console.error('Failed to send OTP email via Resend:', err);
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Failed to send verification email.',
    };
  }
}

