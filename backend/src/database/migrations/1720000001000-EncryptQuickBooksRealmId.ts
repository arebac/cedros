import { MigrationInterface, QueryRunner } from 'typeorm';

export class EncryptQuickBooksRealmId1720000001000 implements MigrationInterface {
  name = 'EncryptQuickBooksRealmId1720000001000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    if (queryRunner.connection.options.type === 'postgres') {
      await queryRunner.query('ALTER TABLE "quickbooks_connections" ADD COLUMN IF NOT EXISTS "realmIdCiphertext" text');
      await queryRunner.query('ALTER TABLE "quickbooks_connections" ALTER COLUMN "realmId" DROP NOT NULL');
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    if (queryRunner.connection.options.type === 'postgres') {
      await queryRunner.query('ALTER TABLE "quickbooks_connections" DROP COLUMN IF EXISTS "realmIdCiphertext"');
    }
  }
}
