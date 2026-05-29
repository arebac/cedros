import { Controller, Post, Get, Body, UseGuards, Req, Headers } from '@nestjs/common';
import type { Request } from 'express';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { PaymentsService } from './payments.service';
import { PaymentMethod } from './payment.entity';
import { User } from '../users/user.entity';
import { IsEnum } from 'class-validator';

class CreatePaymentIntentDto {
  @IsEnum(PaymentMethod)
  method: PaymentMethod;
}

@Controller('payments')
export class PaymentsController {
  constructor(private payments: PaymentsService) {}

  @Post('create-intent')
  @UseGuards(JwtAuthGuard)
  createIntent(@CurrentUser() user: User, @Body() dto: CreatePaymentIntentDto) {
    return this.payments.createPaymentIntent(user, dto.method);
  }

  @Get('history')
  @UseGuards(JwtAuthGuard)
  getHistory(@CurrentUser() user: User) {
    return this.payments.getHistory(user.id);
  }

  @Get('status')
  @UseGuards(JwtAuthGuard)
  getStatus(@CurrentUser() user: User) {
    return this.payments.getStatus(user.id);
  }

  @Post('webhook')
  webhook(
    @Req() req: Request & { rawBody?: Buffer },
    @Headers('stripe-signature') sig: string,
  ) {
    return this.payments.handleWebhook(req.rawBody, sig);
  }
}
