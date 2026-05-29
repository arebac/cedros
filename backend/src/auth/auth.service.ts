import {
  Injectable,
  UnauthorizedException,
  BadRequestException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import { User } from '../users/user.entity';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User) private users: Repository<User>,
    private jwt: JwtService,
  ) {}

  async login(email: string, password: string) {
    const user = await this.users.findOne({ where: { email, isActive: true } });
    if (!user || !user.passwordHash) throw new UnauthorizedException('Invalid credentials');

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) throw new UnauthorizedException('Invalid credentials');

    return { token: this.sign(user), user: this.sanitize(user) };
  }

  async acceptInvite(token: string, password: string) {
    const user = await this.users.findOne({ where: { inviteToken: token } });
    if (!user) throw new BadRequestException('Invalid or expired invite link');
    if (!user.inviteTokenExpiresAt || user.inviteTokenExpiresAt < new Date()) {
      throw new BadRequestException('Invite link has expired');
    }

    user.passwordHash = await bcrypt.hash(password, 12);
    user.isActive = true;
    user.inviteToken = null;
    user.inviteTokenExpiresAt = null;
    await this.users.save(user);

    return { token: this.sign(user), user: this.sanitize(user) };
  }

  async validateInviteToken(token: string) {
    const user = await this.users.findOne({ where: { inviteToken: token } });
    if (!user || !user.inviteTokenExpiresAt || user.inviteTokenExpiresAt < new Date()) {
      throw new BadRequestException('Invalid or expired invite link');
    }
    return { email: user.email, firstName: user.firstName, apartmentNumber: user.apartmentNumber };
  }

  generateInviteToken(): { token: string; expiresAt: Date } {
    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);
    return { token, expiresAt };
  }

  private sign(user: User) {
    return this.jwt.sign({ sub: user.id, role: user.role });
  }

  private sanitize(user: User) {
    const { passwordHash, inviteToken, inviteTokenExpiresAt, ...safe } = user;
    return safe;
  }
}
