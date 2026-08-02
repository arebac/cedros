import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { UserRole } from '../users/user.entity';
import { Announcement } from './announcement.entity';

@Controller('announcements')
export class NotificationsController {
  constructor(
    @InjectRepository(Announcement) private announcements: Repository<Announcement>,
  ) {}

  @Get()
  @UseGuards(JwtAuthGuard)
  findAll() {
    return this.announcements.find({ where: { isActive: true }, order: { createdAt: 'DESC' } });
  }

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  create(@Body() dto: Partial<Announcement>) {
    return this.announcements.save(this.announcements.create(dto));
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  async update(@Param('id') id: string, @Body() dto: Partial<Announcement>) {
    await this.announcements.update(id, dto);
    return this.announcements.findOne({ where: { id } });
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  async remove(@Param('id') id: string) {
    await this.announcements.update(id, { isActive: false });
    return { success: true };
  }
}
