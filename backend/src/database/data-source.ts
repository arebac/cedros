import { DataSource, DataSourceOptions } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { config as loadEnv } from 'dotenv';
import { createTypeOrmOptions } from './typeorm.config';

loadEnv();

export default new DataSource(createTypeOrmOptions(new ConfigService()) as DataSourceOptions);
