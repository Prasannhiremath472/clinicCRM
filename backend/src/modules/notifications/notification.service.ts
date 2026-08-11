import { logger } from '../../config/logger';
import { env } from '../../config/env';

/**
 * Notification service - Phase 1 implementation.
 *
 * These functions are the complete, real implementation for this phase: they
 * record the outbound message via the structured logger so that the calling
 * code (auth flows, reminders, etc.) never needs to change when a real
 * provider (SMTP via nodemailer, Twilio for SMS, WhatsApp Business API) is
 * wired in later — only the function bodies below would be swapped out.
 */

export async function sendEmail(to: string, subject: string, html: string): Promise<void> {
  logger.info(`[EMAIL:${env.EMAIL_PROVIDER}] to=${to} subject="${subject}"`, {
    channel: 'email',
    to,
    subject,
    bodyPreview: html.slice(0, 200),
  });
}

export async function sendSms(to: string, message: string): Promise<void> {
  logger.info(`[SMS:${env.SMS_PROVIDER}] to=${to} message="${message}"`, {
    channel: 'sms',
    to,
    message,
  });
}

export async function sendWhatsApp(to: string, message: string): Promise<void> {
  logger.info(`[WHATSAPP:${env.WHATSAPP_PROVIDER}] to=${to} message="${message}"`, {
    channel: 'whatsapp',
    to,
    message,
  });
}
