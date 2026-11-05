import nodemailer from "nodemailer";

/** Last message sent when MAIL_MODE=memory (used by the API tests). */
export const outbox: { to: string; code: string }[] = [];

export async function sendLoginCode(to: string, code: string) {
  if (process.env.MAIL_MODE === "memory") {
    outbox.push({ to, code });
    return;
  }
  if (!process.env.SMTP_HOST) {
    // local dev without SMTP: print the code in the server console instead of emailing it
    console.log(`[login code] ${to}: ${code}`);
    return;
  }
  const transport = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT ?? 587),
    secure: Number(process.env.SMTP_PORT) === 465,
    auth: process.env.SMTP_USER ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS } : undefined,
  });
  await transport.sendMail({
    from: process.env.MAIL_FROM ?? process.env.SMTP_USER,
    to,
    subject: `${code} is your The Last of O.S login code`,
    text: `Your login code is ${code}\n\nIt expires in 10 minutes. If you did not ask for it, ignore this email.`,
  });
}
