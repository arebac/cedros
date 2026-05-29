import { Controller, Get, Patch, Body, UseGuards, Param } from '@nestjs/common';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { UsersService } from './users.service';
import { User } from './user.entity';

@Controller('users')
@UseGuards(JwtAuthGuard)
export class UsersController {
  constructor(private users: UsersService) {}

  @Get('me')
  getMe(@CurrentUser() user: User) {
    return user;
  }

  @Patch('me')
  updateMe(@CurrentUser() user: User, @Body() body: Partial<User>) {
    const { role, isActive, passwordHash, ...safe } = body as any;
    return this.users.update(user.id, safe);
  }

  @Patch('me/autopay')
  toggleAutopay(@CurrentUser() user: User, @Body() body: { enabled: boolean; stripePaymentMethodId?: string }) {
    return this.users.update(user.id, {
      autopayEnabled: body.enabled,
      stripePaymentMethodId: body.stripePaymentMethodId,
    });
  }
}
