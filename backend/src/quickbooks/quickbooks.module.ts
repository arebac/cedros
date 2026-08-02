import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { QuickbooksService } from './quickbooks.service';
import { QuickbooksController } from './quickbooks.controller';
import { QuickbooksConnection } from './quickbooks-connection.entity';

@Module({
  imports: [TypeOrmModule.forFeature([QuickbooksConnection])],
  providers: [QuickbooksService],
  controllers: [QuickbooksController],
  exports: [QuickbooksService],
})
export class QuickbooksModule {}
