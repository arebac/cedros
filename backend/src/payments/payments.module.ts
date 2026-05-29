import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Payment } from './payment.entity';
import { User } from '../users/user.entity';
import { PaymentsService } from './payments.service';
import { PaymentsController } from './payments.controller';
import { NotificationsModule } from '../notifications/notifications.module';
import { QuickbooksModule } from '../quickbooks/quickbooks.module';

@Module({
  imports: [TypeOrmModule.forFeature([Payment, User]), NotificationsModule, QuickbooksModule],
  providers: [PaymentsService],
  controllers: [PaymentsController],
  exports: [PaymentsService],
})
export class PaymentsModule {}
