import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
} from 'typeorm';
import { Payment } from '../payments/payment.entity';

export enum UserRole {
  ADMIN = 'admin',
  RESIDENT = 'resident',
}

export enum Language {
  ES = 'es',
  EN = 'en',
}

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  firstName: string;

  @Column()
  lastName: string;

  @Column({ unique: true })
  email: string;

  @Column({ nullable: true })
  passwordHash: string;

  @Column({ nullable: true })
  phone: string;

  @Column()
  apartmentNumber: string;

  @Column({ type: 'float' })
  monthlyFee: number;

  @Column({ type: 'simple-enum', enum: UserRole, default: UserRole.RESIDENT })
  role: UserRole;

  @Column({ type: 'simple-enum', enum: Language, default: Language.ES })
  language: Language;

  @Column({ nullable: true, type: 'datetime' })
  moveInDate: Date;

  @Column({ nullable: true, type: 'varchar' })
  inviteToken: string | null;

  @Column({ nullable: true, type: 'datetime' })
  inviteTokenExpiresAt: Date | null;

  @Column({ default: false })
  isActive: boolean;

  @Column({ nullable: true })
  stripeCustomerId: string;

  @Column({ nullable: true })
  stripePaymentMethodId: string;

  @Column({ default: false })
  autopayEnabled: boolean;

  @OneToMany(() => Payment, (payment) => payment.user)
  payments: Payment[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  get fullName(): string {
    return `${this.firstName} ${this.lastName}`;
  }

  get isPenthouse(): boolean {
    return this.apartmentNumber.startsWith('4');
  }
}
