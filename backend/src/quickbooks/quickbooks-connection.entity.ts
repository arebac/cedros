import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';

@Entity('quickbooks_connections')
export class QuickbooksConnection {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ default: 'sandbox' })
  environment: string;

  @Column({ type: 'varchar', nullable: true })
  realmId: string | null;

  @Column({ type: 'text', nullable: true })
  realmIdCiphertext: string | null;

  @Column({ type: 'text' })
  accessTokenCiphertext: string;

  @Column({ type: 'text' })
  refreshTokenCiphertext: string;

  @Column({ default: 'bearer' })
  tokenType: string;

  @Column({ type: 'int', default: 0 })
  expiresIn: number;

  @Column({ type: 'int', default: 0 })
  refreshTokenExpiresIn: number;

  @Column({ type: 'int', default: 0 })
  refreshTokenLifetimeExpiresIn: number;

  @Column({ type: 'text', nullable: true })
  idTokenCiphertext: string | null;

  @Column({ type: 'bigint' })
  tokenCreatedAt: number;

  @Column({ default: true })
  active: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
