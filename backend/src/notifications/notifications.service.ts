import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Resend } from 'resend';
import { User, Language } from '../users/user.entity';
import { Payment } from '../payments/payment.entity';

@Injectable()
export class NotificationsService {
  private resend: Resend;
  private from: string;
  private readonly logger = new Logger(NotificationsService.name);

  constructor(private config: ConfigService) {
    this.resend = new Resend(config.get('RESEND_API_KEY'));
    this.from = config.get('EMAIL_FROM', 'noreply@condominioloscedros.com');
  }

  async sendInviteEmail(user: User, token: string): Promise<void> {
    const frontendUrl = this.config.get('FRONTEND_URL', 'http://localhost:5173');
    const link = `${frontendUrl}/accept-invite?token=${token}`;

    const subject = user.language === Language.ES
      ? 'Bienvenido a Condominio Los Cedros'
      : 'Welcome to Condominio Los Cedros';

    const html = user.language === Language.ES
      ? `<p>Hola ${user.firstName},</p><p>Tu cuenta ha sido creada para el Apartamento <strong>${user.apartmentNumber}</strong>.</p><p><a href="${link}">Haz clic aquí para configurar tu contraseña</a></p><p>Este enlace expira en 7 días.</p>`
      : `<p>Hi ${user.firstName},</p><p>Your account has been created for Apartment <strong>${user.apartmentNumber}</strong>.</p><p><a href="${link}">Click here to set up your password</a></p><p>This link expires in 7 days.</p>`;

    await this.send(user.email, subject, html);
  }

  async sendPaymentReceipt(user: User, payment: Payment): Promise<void> {
    const subject = user.language === Language.ES
      ? `Recibo de pago - Apto ${user.apartmentNumber}`
      : `Payment receipt - Apt ${user.apartmentNumber}`;

    const date = new Date(payment.createdAt).toLocaleDateString(
      user.language === Language.ES ? 'es-DO' : 'en-US',
    );

    const html = user.language === Language.ES
      ? `<p>Hola ${user.firstName},</p><p>Confirmamos tu pago de <strong>$${Number(payment.amount).toFixed(2)}</strong> recibido el ${date}.</p><p>Apartamento: ${user.apartmentNumber}<br/>Referencia: ${payment.stripeChargeId || payment.id}</p>`
      : `<p>Hi ${user.firstName},</p><p>We confirm your payment of <strong>$${Number(payment.amount).toFixed(2)}</strong> received on ${date}.</p><p>Apartment: ${user.apartmentNumber}<br/>Reference: ${payment.stripeChargeId || payment.id}</p>`;

    await this.send(user.email, subject, html);
  }

  async sendPaymentReminder(user: User, daysUntilDue: number): Promise<void> {
    const isLate = daysUntilDue < 0;
    const subject = user.language === Language.ES
      ? isLate ? `Pago vencido - Apto ${user.apartmentNumber}` : `Recordatorio de pago - Apto ${user.apartmentNumber}`
      : isLate ? `Overdue payment - Apt ${user.apartmentNumber}` : `Payment reminder - Apt ${user.apartmentNumber}`;

    const message = user.language === Language.ES
      ? isLate
        ? `Tu cuota de mantenimiento de <strong>$${Number(user.monthlyFee).toFixed(2)}</strong> está vencida. Por favor realiza tu pago a la brevedad posible.`
        : `Tu cuota de mantenimiento de <strong>$${Number(user.monthlyFee).toFixed(2)}</strong> vence en ${daysUntilDue} día(s). Por favor realiza tu pago a tiempo.`
      : isLate
        ? `Your HOA fee of <strong>$${Number(user.monthlyFee).toFixed(2)}</strong> is overdue. Please make your payment as soon as possible.`
        : `Your HOA fee of <strong>$${Number(user.monthlyFee).toFixed(2)}</strong> is due in ${daysUntilDue} day(s). Please pay on time.`;

    const frontendUrl = this.config.get('FRONTEND_URL', 'http://localhost:5173');
    const html = `<p>Hola ${user.firstName},</p><p>${message}</p><p><a href="${frontendUrl}/dashboard">Pagar ahora / Pay now</a></p>`;

    await this.send(user.email, subject, html);
  }

  async sendBlastEmail(users: User[], subjectEs: string, subjectEn: string, bodyEs: string, bodyEn: string): Promise<void> {
    await Promise.all(
      users.map((user) => {
        const subject = user.language === Language.ES ? subjectEs : subjectEn;
        const body = user.language === Language.ES ? bodyEs : bodyEn;
        const html = `<p>Hola ${user.firstName},</p><p>${body}</p>`;
        return this.send(user.email, subject, html);
      }),
    );
  }

  private async send(to: string, subject: string, html: string): Promise<void> {
    try {
      await this.resend.emails.send({ from: this.from, to, subject, html });
    } catch (err) {
      this.logger.error(`Failed to send email to ${to}: ${err.message}`);
    }
  }
}
