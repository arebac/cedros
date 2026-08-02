import { ConfigService } from '@nestjs/config';
import { TypeOrmModuleOptions } from '@nestjs/typeorm';
import { User } from '../users/user.entity';
import { Payment } from '../payments/payment.entity';
import { Announcement } from '../notifications/announcement.entity';
import { QuickbooksConnection } from '../quickbooks/quickbooks-connection.entity';

const entities = [User, Payment, Announcement, QuickbooksConnection];
const migrations = [__dirname + '/migrations/*{.ts,.js}'];
const placeholderDatabaseUrl = 'postgresql://user:password@host:5432/cedros';

function shouldSynchronize(config: ConfigService, nodeEnv: string): boolean {
  if (nodeEnv === 'production') return false;
  return config.get<string>('TYPEORM_SYNCHRONIZE', 'true') !== 'false';
}

export function createTypeOrmOptions(config: ConfigService): TypeOrmModuleOptions {
  const databaseUrl = config.get<string>('DATABASE_URL');
  const nodeEnv = config.get<string>('NODE_ENV', 'development');

  if (databaseUrl && databaseUrl !== placeholderDatabaseUrl) {
    const sslEnabled = config.get<string>('DATABASE_SSL', nodeEnv === 'production' ? 'true' : 'false') === 'true';

    return {
      type: 'postgres',
      url: databaseUrl,
      entities,
      migrations,
      migrationsTableName: 'typeorm_migrations',
      synchronize: shouldSynchronize(config, nodeEnv),
      ssl: sslEnabled ? { rejectUnauthorized: false } : false,
    };
  }

  if (nodeEnv === 'production') {
    throw new Error('DATABASE_URL is required in production');
  }

  return {
    type: 'better-sqlite3',
    database: 'cedros-dev.sqlite',
    entities,
    migrations,
    migrationsTableName: 'typeorm_migrations',
    synchronize: true,
  } as TypeOrmModuleOptions;
}
