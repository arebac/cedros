import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ScheduleModule } from '@nestjs/schedule';
import { User } from './users/user.entity';
import { Payment } from './payments/payment.entity';
import { Announcement } from './notifications/announcement.entity';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { PaymentsModule } from './payments/payments.module';
import { NotificationsModule } from './notifications/notifications.module';
import { QuickbooksModule } from './quickbooks/quickbooks.module';
import { AdminModule } from './admin/admin.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ScheduleModule.forRoot(),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (config: ConfigService) => {
        const dbUrl = config.get('DATABASE_URL');
        if (dbUrl && dbUrl !== 'postgresql://user:password@host:5432/cedros') {
          return {
            type: 'postgres',
            url: dbUrl,
            entities: [User, Payment, Announcement],
            synchronize: true,
            ssl: config.get('NODE_ENV') === 'production' ? { rejectUnauthorized: false } : false,
          };
        }
        return {
          type: 'better-sqlite3',
          database: 'cedros-dev.sqlite',
          entities: [User, Payment, Announcement],
          synchronize: true,
        } as any;
      },
      inject: [ConfigService],
    }),
    AuthModule,
    UsersModule,
    PaymentsModule,
    NotificationsModule,
    QuickbooksModule,
    AdminModule,
  ],
})
export class AppModule {}
