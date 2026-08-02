import { Controller, Get, Patch, Body, UseGuards } from '@nestjs/common';
import { IsEnum, IsOptional, IsString } from 'class-validator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { UsersService } from './users.service';
import { Language, User } from './user.entity';

class UpdateMeDto {
  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsEnum(Language)
  language?: Language;
}

@Controller('users')
@UseGuards(JwtAuthGuard)
export class UsersController {
  constructor(private users: UsersService) {}

  @Get('me')
  getMe(@CurrentUser() user: User) {
    return user;
  }

  @Patch('me')
  updateMe(@CurrentUser() user: User, @Body() body: UpdateMeDto) {
    return this.users.update(user.id, body);
  }

  @Patch('me/autopay')
  toggleAutopay(@CurrentUser() user: User, @Body() body: { enabled: boolean; stripePaymentMethodId?: string }) {
    return this.users.update(user.id, {
      autopayEnabled: body.enabled,
      stripePaymentMethodId: body.stripePaymentMethodId,
    });
  }
}
