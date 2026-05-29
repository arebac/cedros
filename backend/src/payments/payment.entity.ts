import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { User } from '../users/user.entity';

export enum PaymentStatus {
  PENDING = 'pending',
  COMPLETED = 'completed',
  FAILED = 'failed',
  MANUAL = 'manual',
}

export enum PaymentMethod {
  CARD = 'card',
  ACH = 'ach',
  MANUAL = 'manual',
}

@Entity('payments')
export class Payment {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => User, (user) => user.payments, { eager: true })
  @JoinColumn({ name: 'userId' })
  user: User;

  @Column()
  userId: string;

  @Column({ type: 'float' })
  amount: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  processingFee: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  lateFee: number;

  @Column({ type: 'simple-enum', enum: PaymentStatus, default: PaymentStatus.PENDING })
  status: PaymentStatus;

  @Column({ type: 'simple-enum', enum: PaymentMethod })
  method: PaymentMethod;

  @Column({ nullable: true })
  stripePaymentIntentId: string;

  @Column({ nullable: true })
  stripeChargeId: string;

  @Column({ nullable: true })
  quickbooksPaymentId: string;

  @Column({ type: 'int' })
  billingMonth: number;

  @Column({ type: 'int' })
  billingYear: number;

  @Column({ nullable: true })
  notes: string;

  @CreateDateColumn()
  createdAt: Date;
}
