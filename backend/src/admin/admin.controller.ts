import { Controller, Get, Post, Body, Param, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { UserRole, Language } from '../users/user.entity';
import { UsersService } from '../users/users.service';
import { PaymentsService } from '../payments/payments.service';
import { NotificationsService } from '../notifications/notifications.service';
import { IsString, IsEmail, IsOptional, IsEnum, IsInt, IsDateString } from 'class-validator';

class CreateResidentDto {
  @IsString() firstName: string;
  @IsString() lastName: string;
  @IsEmail() email: string;
  @IsString() apartmentNumber: string;
  @IsOptional() @IsString() phone?: string;
  @IsOptional() @IsDateString() moveInDate?: Date;
  @IsOptional() @IsEnum(Language) language?: Language;
}

class ManualPaymentDto {
  @IsString() userId: string;
  @IsString() notes: string;
  @IsInt() billingMonth: number;
  @IsInt() billingYear: number;
}

class BlastEmailDto {
  @IsString() subjectEs: string;
  @IsString() subjectEn: string;
  @IsString() bodyEs: string;
  @IsString() bodyEn: string;
  @IsOptional() userIds?: string[];
}

@Controller('admin')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
export class AdminController {
  constructor(
    private users: UsersService,
    private paymentsService: PaymentsService,
    private notifications: NotificationsService,
  ) {}

  @Get('residents')
  getAllResidents() {
    return this.users.findAll();
  }

  @Post('residents')
  createResident(@Body() dto: CreateResidentDto) {
    return this.users.createResident(dto);
  }

  @Post('residents/:id/resend-invite')
  resendInvite(@Param('id') id: string) {
    return this.users.resendInvite(id);
  }

  @Get('overview')
  async getOverview() {
    const residents = await this.users.findAll();
    const now = new Date();
    const month = now.getMonth() + 1;
    const year = now.getFullYear();

    const statuses = await Promise.all(
      residents.map(async (r) => {
        const status = await this.paymentsService.getStatus(r.id);
        return {
          id: r.id,
          fullName: r.fullName,
          apartmentNumber: r.apartmentNumber,
          email: r.email,
          monthlyFee: r.monthlyFee,
          isActive: r.isActive,
          ...status,
        };
      }),
    );

    return {
      month,
      year,
      total: residents.length,
      paid: statuses.filter((s) => s.paid).length,
      unpaid: statuses.filter((s) => !s.paid && s.isActive).length,
      residents: statuses,
    };
  }

  @Post('payments/manual')
  recordManualPayment(@Body() dto: ManualPaymentDto) {
    return this.paymentsService.recordManualPayment(
      dto.userId,
      dto.notes,
      dto.billingMonth,
      dto.billingYear,
    );
  }

  @Get('residents/:id/payments')
  getResidentPayments(@Param('id') id: string) {
    return this.paymentsService.getHistory(id);
  }

  @Post('email-blast')
  async sendBlast(@Body() dto: BlastEmailDto) {
    const all = await this.users.findAll();
    const targets = dto.userIds?.length
      ? all.filter((u) => dto.userIds!.includes(u.id))
      : all;

    await this.notifications.sendBlastEmail(
      targets,
      dto.subjectEs,
      dto.subjectEn,
      dto.bodyEs,
      dto.bodyEn,
    );

    return { sent: targets.length };
  }
}
