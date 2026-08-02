import { MigrationInterface, QueryRunner } from 'typeorm';

export class InitialSchema1720000000000 implements MigrationInterface {
  name = 'InitialSchema1720000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('CREATE EXTENSION IF NOT EXISTS "uuid-ossp"');

    await queryRunner.query(`
      CREATE TABLE "users" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "firstName" character varying NOT NULL,
        "lastName" character varying NOT NULL,
        "email" character varying NOT NULL,
        "passwordHash" character varying,
        "phone" character varying,
        "apartmentNumber" character varying NOT NULL,
        "monthlyFee" double precision NOT NULL,
        "role" character varying NOT NULL DEFAULT 'resident',
        "language" character varying NOT NULL DEFAULT 'es',
        "moveInDate" timestamp,
        "inviteToken" character varying,
        "inviteTokenExpiresAt" timestamp,
        "isActive" boolean NOT NULL DEFAULT false,
        "stripeCustomerId" character varying,
        "stripePaymentMethodId" character varying,
        "quickbooksCustomerId" character varying,
        "quickbooksCustomerName" character varying,
        "autopayEnabled" boolean NOT NULL DEFAULT false,
        "createdAt" timestamp NOT NULL DEFAULT now(),
        "updatedAt" timestamp NOT NULL DEFAULT now(),
        CONSTRAINT "UQ_users_email" UNIQUE ("email"),
        CONSTRAINT "PK_users" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "announcements" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "titleEs" character varying NOT NULL,
        "titleEn" character varying NOT NULL,
        "bodyEs" text NOT NULL,
        "bodyEn" text NOT NULL,
        "isActive" boolean NOT NULL DEFAULT true,
        "createdAt" timestamp NOT NULL DEFAULT now(),
        "updatedAt" timestamp NOT NULL DEFAULT now(),
        CONSTRAINT "PK_announcements" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "quickbooks_connections" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "environment" character varying NOT NULL DEFAULT 'sandbox',
        "realmId" character varying NOT NULL,
        "accessTokenCiphertext" text NOT NULL,
        "refreshTokenCiphertext" text NOT NULL,
        "tokenType" character varying NOT NULL DEFAULT 'bearer',
        "expiresIn" integer NOT NULL DEFAULT 0,
        "refreshTokenExpiresIn" integer NOT NULL DEFAULT 0,
        "refreshTokenLifetimeExpiresIn" integer NOT NULL DEFAULT 0,
        "idTokenCiphertext" text,
        "tokenCreatedAt" bigint NOT NULL,
        "active" boolean NOT NULL DEFAULT true,
        "createdAt" timestamp NOT NULL DEFAULT now(),
        "updatedAt" timestamp NOT NULL DEFAULT now(),
        CONSTRAINT "PK_quickbooks_connections" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "payments" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "userId" uuid NOT NULL,
        "amount" double precision NOT NULL,
        "processingFee" numeric(10,2) NOT NULL DEFAULT '0',
        "lateFee" numeric(10,2) NOT NULL DEFAULT '0',
        "status" character varying NOT NULL DEFAULT 'pending',
        "method" character varying NOT NULL,
        "stripePaymentIntentId" character varying,
        "stripeChargeId" character varying,
        "quickbooksPaymentId" character varying,
        "billingMonth" integer NOT NULL,
        "billingYear" integer NOT NULL,
        "notes" character varying,
        "createdAt" timestamp NOT NULL DEFAULT now(),
        CONSTRAINT "PK_payments" PRIMARY KEY ("id"),
        CONSTRAINT "FK_payments_user" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION
      )
    `);

    await queryRunner.query('CREATE UNIQUE INDEX "IDX_payments_stripePaymentIntentId" ON "payments" ("stripePaymentIntentId")');
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP INDEX IF EXISTS "IDX_payments_stripePaymentIntentId"');
    await queryRunner.query('DROP TABLE IF EXISTS "payments"');
    await queryRunner.query('DROP TABLE IF EXISTS "quickbooks_connections"');
    await queryRunner.query('DROP TABLE IF EXISTS "announcements"');
    await queryRunner.query('DROP TABLE IF EXISTS "users"');
  }
}
