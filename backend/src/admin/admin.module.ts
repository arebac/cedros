import { Module } from '@nestjs/common';
import { AdminController } from './admin.controller';
import { UsersModule } from '../users/users.module';
import { PaymentsModule } from '../payments/payments.module';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [UsersModule, PaymentsModule, NotificationsModule],
  controllers: [AdminController],
})
export class AdminModule {}
