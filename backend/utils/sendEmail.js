import nodemailer from 'nodemailer';

export const sendEmail = async (options) => {
  const { SMTP_HOST, SMTP_PORT, SMTP_SECURE, SMTP_USER, SMTP_PASS, SMTP_FROM } = process.env;

  if (!SMTP_USER || !SMTP_PASS) {
    console.warn('\n⚠️  SMTP_USER or SMTP_PASS not set in .env');
    console.warn(`📩  Mock Email Sent to ${options.email}`);
    console.warn(`Subject: ${options.subject}`);
    console.warn(`Message:\n${options.message}\n`);
    return true; // Pretend it succeeded
  }

  const transporter = nodemailer.createTransport({
    host: SMTP_HOST || 'smtp.gmail.com',
    port: SMTP_PORT || 465,
    secure: SMTP_SECURE === 'true',
    auth: {
      user: SMTP_USER,
      pass: SMTP_PASS
    }
  });

  const mailOptions = {
    from: SMTP_FROM || `StaffSync Pro <${SMTP_USER}>`,
    to: options.email,
    subject: options.subject,
    html: options.message,
  };

  await transporter.sendMail(mailOptions);
};
