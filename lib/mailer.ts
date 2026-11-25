import nodemailer from 'nodemailer';

export async function sendPasswordResetEmail(
  to: string,
  code: string
): Promise<{ sent: boolean }> {
  const host = process.env.SMTP_HOST;
  const port = Number(process.env.SMTP_PORT || 587);
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  const from = process.env.SMTP_FROM || user || 'noreply@nirmal-calculus.app';

  if (!host || !user || !pass) {
    if (process.env.NODE_ENV !== 'production') {
      console.log(`[DEV MAILER] Password reset code for ${to}: ${code}`);
    }
    return { sent: false };
  }

  const transporter = nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: { user, pass },
  });

  await transporter.sendMail({
    from: `"Nirmal∫ Calculus Studio" <${from}>`,
    to,
    subject: 'Your Password Reset Code — Nirmal∫ Calculus Studio',
    text: `Your password reset verification code is: ${code}\n\nThis code expires in 15 minutes. If you did not request a password reset, you can safely ignore this email.`,
    html: `
      <div style="font-family: system-ui, sans-serif; max-width: 480px; margin: 0 auto; padding: 24px; border: 1px solid #e2e1da; border-radius: 12px;">
        <h2 style="margin-top: 0;">Nirmal<span style="color: #2b4acb;">∫</span> Password Reset</h2>
        <p>Use the verification code below to reset your password:</p>
        <div style="font-size: 28px; font-weight: 700; letter-spacing: 6px; padding: 14px 20px; background: #f6f6f2; border-radius: 10px; text-align: center; color: #2b4acb; margin: 16px 0;">
          ${code}
        </div>
        <p style="color: #64646c; font-size: 14px;">This code expires in <strong>15 minutes</strong>. If you didn't request this, ignore this email.</p>
      </div>
    `,
  });

  return { sent: true };
}
