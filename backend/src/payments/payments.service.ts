import { Injectable, BadRequestException, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import Stripe from 'stripe';
import { Payment, PaymentMethod, PaymentStatus } from './payment.entity';
import { User } from '../users/user.entity';
import { NotificationsService } from '../notifications/notifications.service';
import { QuickbooksService } from '../quickbooks/quickbooks.service';

@Injectable()
export class PaymentsService {
  private stripe: InstanceType<typeof Stripe>;
  private readonly logger = new Logger(PaymentsService.name);

  constructor(
    @InjectRepository(Payment) private payments: Repository<Payment>,
    @InjectRepository(User) private users: Repository<User>,
    private config: ConfigService,
    private notifications: NotificationsService,
    private quickbooks: QuickbooksService,
  ) {
    this.stripe = new Stripe(config.get<string>('STRIPE_SECRET_KEY', ''), {
      apiVersion: '2025-04-30.basil' as any,
    });
  }

  calculateFee(amount: number, method: PaymentMethod): number {
    if (method === PaymentMethod.ACH) {
      return Math.min(amount * 0.008, 5);
    }
    return amount * 0.029 + 0.30;
  }

  async createPaymentIntent(user: User, method: PaymentMethod) {
    const baseAmount = Number(user.monthlyFee);
    const fee = this.calculateFee(baseAmount, method);
    const total = baseAmount + fee;
    const amountCents = Math.round(total * 100);

    let customerId = user.stripeCustomerId;
    if (!customerId) {
      const customer = await this.stripe.customers.create({
        email: user.email,
        name: user.fullName,
        metadata: { apartmentNumber: user.apartmentNumber, userId: user.id },
      });
      customerId = customer.id;
      await this.users.update(user.id, { stripeCustomerId: customerId });
    }

    const now = new Date();
    const intent = await this.stripe.paymentIntents.create({
      amount: amountCents,
      currency: 'usd',
      customer: customerId,
      payment_method_types: method === PaymentMethod.ACH ? ['us_bank_account'] : ['card'],
      metadata: {
        userId: user.id,
        apartmentNumber: user.apartmentNumber,
        billingMonth: String(now.getMonth() + 1),
        billingYear: String(now.getFullYear()),
        processingFee: fee.toFixed(2),
        method,
      },
    });

    return {
      clientSecret: intent.client_secret,
      fee: Number(fee.toFixed(2)),
      total: Number(total.toFixed(2)),
      baseAmount,
    };
  }

  async handleWebhook(rawBody: Buffer | undefined, signature: string): Promise<void> {
    if (!rawBody) throw new BadRequestException('Missing raw body');
    const webhookSecret = this.config.get<string>('STRIPE_WEBHOOK_SECRET', '');
    let event: any;

    try {
      event = this.stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);
    } catch {
      throw new BadRequestException('Invalid webhook signature');
    }

    if (event.type === 'payment_intent.succeeded') {
      await this.handlePaymentSuccess(event.data.object);
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private async handlePaymentSuccess(intent: any): Promise<void> {
    const { userId, billingMonth, billingYear, processingFee, method } = intent.metadata;

    const user = await this.users.findOne({ where: { id: userId } });
    if (!user) return;

    const baseAmount = Number(user.monthlyFee);

    const payment = this.payments.create({
      userId,
      amount: baseAmount,
      processingFee: Number(processingFee),
      method: method as PaymentMethod,
      status: PaymentStatus.COMPLETED,
      stripePaymentIntentId: intent.id,
      stripeChargeId: intent.latest_charge as string,
      billingMonth: Number(billingMonth),
      billingYear: Number(billingYear),
    });

    await this.payments.save(payment);
    await this.notifications.sendPaymentReceipt(user, payment);
    await this.quickbooks.syncPayment(user, payment).catch((err) =>
      this.logger.error(`QuickBooks sync failed for payment ${payment.id}: ${err.message}`),
    );
  }

  async getHistory(userId: string): Promise<Payment[]> {
    return this.payments.find({
      where: { userId },
      order: { createdAt: 'DESC' },
    });
  }

  async getStatus(userId: string): Promise<{ paid: boolean; billingMonth: number; billingYear: number; balance: number }> {
    const now = new Date();
    const billingMonth = now.getMonth() + 1;
    const billingYear = now.getFullYear();

    const [payment, user] = await Promise.all([
      this.payments.findOne({ where: { userId, billingMonth, billingYear, status: PaymentStatus.COMPLETED } }),
      this.users.findOne({ where: { id: userId } }),
    ]);

    if (!user) throw new NotFoundException('User not found');

    return {
      paid: !!payment,
      billingMonth,
      billingYear,
      balance: payment ? 0 : Number(user.monthlyFee),
    };
  }

  async recordManualPayment(userId: string, notes: string, billingMonth: number, billingYear: number): Promise<Payment> {
    const user = await this.users.findOne({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');

    const payment = this.payments.create({
      userId,
      amount: Number(user.monthlyFee),
      processingFee: 0,
      method: PaymentMethod.MANUAL,
      status: PaymentStatus.MANUAL,
      billingMonth,
      billingYear,
      notes,
    });
    await this.payments.save(payment);
    await this.quickbooks.syncPayment(user, payment).catch((err) =>
      this.logger.error(`QuickBooks sync failed: ${err.message}`),
    );
    return payment;
  }
}
