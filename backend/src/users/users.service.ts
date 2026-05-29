import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User, UserRole, Language } from './user.entity';
import { AuthService } from '../auth/auth.service';
import { NotificationsService } from '../notifications/notifications.service';

const PENTHOUSE_FEE = 237.26;
const STANDARD_FEE = 162.03;

export interface CreateUserDto {
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  apartmentNumber: string;
  moveInDate?: Date;
  language?: Language;
}

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User) private users: Repository<User>,
    private auth: AuthService,
    private notifications: NotificationsService,
  ) {}

  async createResident(dto: CreateUserDto): Promise<User> {
    const existing = await this.users.findOne({ where: { email: dto.email } });
    if (existing) throw new ConflictException('Email already registered');

    const { token, expiresAt } = this.auth.generateInviteToken();

    const user = this.users.create({
      ...dto,
      role: UserRole.RESIDENT,
      monthlyFee: dto.apartmentNumber.startsWith('4') ? PENTHOUSE_FEE : STANDARD_FEE,
      inviteToken: token,
      inviteTokenExpiresAt: expiresAt,
      isActive: false,
      language: dto.language || Language.ES,
    });

    await this.users.save(user);
    await this.notifications.sendInviteEmail(user, token);
    return user;
  }

  async findAll(): Promise<User[]> {
    return this.users.find({ order: { apartmentNumber: 'ASC' } });
  }

  async findOne(id: string): Promise<User> {
    const user = await this.users.findOne({ where: { id } });
    if (!user) throw new NotFoundException('User not found');
    return user;
  }

  async findByEmail(email: string): Promise<User | null> {
    return this.users.findOne({ where: { email } });
  }

  async update(id: string, updates: Partial<User>): Promise<User> {
    await this.users.update(id, updates);
    return this.findOne(id);
  }

  async resendInvite(id: string): Promise<void> {
    const user = await this.findOne(id);
    const { token, expiresAt } = this.auth.generateInviteToken();
    user.inviteToken = token;
    user.inviteTokenExpiresAt = expiresAt;
    await this.users.save(user);
    await this.notifications.sendInviteEmail(user, token);
  }
}
