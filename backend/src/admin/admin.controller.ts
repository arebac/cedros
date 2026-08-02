import { Controller, Get, Post, Body, Param, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { UserRole, Language } from '../users/user.entity';
import { UsersService } from '../users/users.service';
import { PaymentsService } from '../payments/payments.service';
import { NotificationsService } from '../notifications/notifications.service';
import { QuickbooksService, QuickBooksCustomer } from '../quickbooks/quickbooks.service';
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

class QuickBooksCustomerMappingDto {
  @IsOptional() @IsString() customerId?: string;
  @IsOptional() @IsString() customerName?: string;
}

function normalize(value: string | undefined | null): string {
  return (value ?? '').toLowerCase().replace(/[^a-z0-9]/g, '');
}

function findBestCustomerMatch(resident: any, customers: QuickBooksCustomer[]) {
  const residentEmail = normalize(resident.email);
  const residentName = normalize(`${resident.firstName} ${resident.lastName}`);
  const residentApt = normalize(resident.apartmentNumber);

  return customers.find((customer) => normalize(customer.email) === residentEmail)
    ?? customers.find((customer) => normalize(customer.displayName) === residentName)
    ?? customers.find((customer) => {
      const displayName = normalize(customer.displayName);
      return displayName.includes(residentName) && displayName.includes(residentApt);
    });
}

@Controller('admin')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
export class AdminController {
  constructor(
    private users: UsersService,
    private paymentsService: PaymentsService,
    private notifications: NotificationsService,
    private quickbooks: QuickbooksService,
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

  @Get('quickbooks/status')
  getQuickBooksStatus() {
    return this.quickbooks.getStatus();
  }

  @Get('quickbooks/connect-url')
  getQuickBooksConnectUrl() {
    return { url: this.quickbooks.getAuthUrl() };
  }

  @Get('quickbooks/customers')
  getQuickBooksCustomers() {
    return this.quickbooks.listCustomers();
  }

  @Post('quickbooks/disconnect')
  disconnectQuickBooks() {
    return this.quickbooks.disconnect();
  }

  @Post('quickbooks/auto-map-customers')
  async autoMapQuickBooksCustomers() {
    const [residents, customers] = await Promise.all([
      this.users.findAll(),
      this.quickbooks.listCustomers(),
    ]);

    const mapped: Array<{ residentId: string; customerId: string; customerName: string }> = [];
    const unmatched: Array<{ residentId: string; name: string; apartmentNumber: string }> = [];

    for (const resident of residents.filter((user) => user.role === UserRole.RESIDENT)) {
      const match = findBestCustomerMatch(resident, customers);
      if (!match) {
        unmatched.push({
          residentId: resident.id,
          name: resident.fullName,
          apartmentNumber: resident.apartmentNumber,
        });
        continue;
      }

      await this.users.update(resident.id, {
        quickbooksCustomerId: match.id,
        quickbooksCustomerName: match.displayName,
      });
      mapped.push({
        residentId: resident.id,
        customerId: match.id,
        customerName: match.displayName,
      });
    }

    return { mapped, unmatched, totalCustomers: customers.length };
  }

  @Post('residents/:id/quickbooks-customer')
  async mapResidentQuickBooksCustomer(@Param('id') id: string, @Body() dto: QuickBooksCustomerMappingDto) {
    return this.users.update(id, {
      quickbooksCustomerId: dto.customerId || null,
      quickbooksCustomerName: dto.customerName || null,
    });
  }
}
