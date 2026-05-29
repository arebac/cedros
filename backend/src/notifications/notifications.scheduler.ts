import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User, UserRole } from '../users/user.entity';
import { Payment, PaymentStatus } from '../payments/payment.entity';
import { NotificationsService } from './notifications.service';

@Injectable()
export class NotificationsScheduler {
  private readonly logger = new Logger(NotificationsScheduler.name);

  constructor(
    @InjectRepository(User) private users: Repository<User>,
    @InjectRepository(Payment) private payments: Repository<Payment>,
    private notifications: NotificationsService,
  ) {}

  // Runs daily at 8am to check who needs reminders
  @Cron('0 8 * * *')
  async sendPaymentReminders() {
    const now = new Date();
    const day = now.getDate();
    const month = now.getMonth() + 1;
    const year = now.getFullYear();

    // Send reminders on the 24th (7 days before), 1st (due date), 6th (5 days late)
    const reminderDays = [24, 1, 6];
    if (!reminderDays.includes(day)) return;

    const residents = await this.users.find({
      where: { role: UserRole.RESIDENT, isActive: true },
    });

    const billingMonth = day === 24 ? month + 1 > 12 ? 1 : month + 1 : month;
    const billingYear = day === 24 && month === 12 ? year + 1 : year;

    for (const user of residents) {
      const paid = await this.payments.findOne({
        where: {
          userId: user.id,
          billingMonth,
          billingYear,
          status: PaymentStatus.COMPLETED,
        },
      });

      if (paid) continue;

      const daysUntilDue = day === 24 ? 7 : day === 1 ? 0 : -5;
      await this.notifications.sendPaymentReminder(user, daysUntilDue);
      this.logger.log(`Sent reminder to ${user.email} (${daysUntilDue} days until/since due)`);
    }
  }
}
