import { Controller, Post, Body, Get, Query } from '@nestjs/common';
import { IsEmail, IsString, MinLength } from 'class-validator';
import { AuthService } from './auth.service';

class LoginDto {
  @IsEmail()
  email: string;

  @IsString()
  password: string;
}

class AcceptInviteDto {
  @IsString()
  token: string;

  @IsString()
  @MinLength(8)
  password: string;
}

@Controller('auth')
export class AuthController {
  constructor(private auth: AuthService) {}

  @Post('login')
  login(@Body() dto: LoginDto) {
    return this.auth.login(dto.email, dto.password);
  }

  @Post('accept-invite')
  acceptInvite(@Body() dto: AcceptInviteDto) {
    return this.auth.acceptInvite(dto.token, dto.password);
  }

  @Get('validate-invite')
  validateInvite(@Query('token') token: string) {
    return this.auth.validateInviteToken(token);
  }
}
