import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { NotificationsService } from './notifications.service';
import { NotificationsScheduler } from './notifications.scheduler';
import { NotificationsController } from './notifications.controller';
import { Announcement } from './announcement.entity';
import { User } from '../users/user.entity';
import { Payment } from '../payments/payment.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Announcement, User, Payment])],
  providers: [NotificationsService, NotificationsScheduler],
  controllers: [NotificationsController],
  exports: [NotificationsService],
})
export class NotificationsModule {}
