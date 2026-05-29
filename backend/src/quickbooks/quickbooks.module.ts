import { Module } from '@nestjs/common';
import { QuickbooksService } from './quickbooks.service';
import { QuickbooksController } from './quickbooks.controller';

@Module({
  providers: [QuickbooksService],
  controllers: [QuickbooksController],
  exports: [QuickbooksService],
})
export class QuickbooksModule {}
