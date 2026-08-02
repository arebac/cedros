import { Controller, Get, Query, Redirect, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { UserRole } from '../users/user.entity';
import { QuickbooksService } from './quickbooks.service';
import { ConfigService } from '@nestjs/config';

@Controller('quickbooks')
export class QuickbooksController {
  constructor(
    private qb: QuickbooksService,
    private config: ConfigService,
  ) {}

  @Get('connect')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @Redirect()
  connect() {
    return { url: this.qb.getAuthUrl() };
  }

  @Get('callback')
  @Redirect()
  async callback(@Query() query: Record<string, string>) {
    const fullUrl = `${this.config.get('QB_REDIRECT_URI')}?${new URLSearchParams(query).toString()}`;
    await this.qb.handleCallback(fullUrl);
    const frontendUrl = this.config.get('FRONTEND_URL', 'http://localhost:5173');
    return { url: `${frontendUrl}/admin?qb=connected` };
  }

  @Get('status')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  status() {
    return { connected: this.qb.isConnected() };
  }
}
