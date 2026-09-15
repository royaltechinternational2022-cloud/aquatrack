import nodemailer from "nodemailer";
import { prisma } from "@/lib/db";

function getTransport() {
  const host = process.env.SMTP_HOST;
  const port = Number(process.env.SMTP_PORT ?? 465);
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  if (!host || !user || !pass) {
    return null;
  }

  return nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: { user, pass },
  });
}

export interface SendReportEmailInput {
  reportType: "DAILY" | "WEEKLY" | "MONTHLY";
  reportPeriod: string;
  recipients: string[];
  subject: string;
  html: string;
}

/** Sends the report to every recipient and writes one EmailLog row per recipient. */
export async function sendReportEmail(input: SendReportEmailInput) {
  const transport = getTransport();
  const from = process.env.SMTP_FROM || process.env.SMTP_USER || "reports@example.com";

  for (const recipient of input.recipients) {
    const existing = await prisma.emailLog.findFirst({
      where: {
        reportType: input.reportType,
        reportPeriod: input.reportPeriod,
        recipient,
        status: "SENT",
      },
    });
    if (existing) continue; // already sent successfully — avoid duplicate sends

    try {
      if (!transport) {
        throw new Error("SMTP is not configured (set SMTP_HOST/SMTP_USER/SMTP_PASS)");
      }
      await transport.sendMail({
        from,
        to: recipient,
        subject: input.subject,
        html: input.html,
      });
      await prisma.emailLog.create({
        data: {
          reportType: input.reportType,
          reportPeriod: input.reportPeriod,
          recipient,
          status: "SENT",
          sentAt: new Date(),
        },
      });
    } catch (err) {
      const previousFailures = await prisma.emailLog.count({
        where: {
          reportType: input.reportType,
          reportPeriod: input.reportPeriod,
          recipient,
          status: "FAILED",
        },
      });
      await prisma.emailLog.create({
        data: {
          reportType: input.reportType,
          reportPeriod: input.reportPeriod,
          recipient,
          status: "FAILED",
          retryCount: previousFailures + 1,
          errorMessage: err instanceof Error ? err.message : String(err),
        },
      });
    }
  }
}
