import { Controller, Get, Patch, Param, UseGuards, Request, Query } from '@nestjs/common';
import { NotificationService } from './notification.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { ApiBearerAuth, ApiOperation, ApiTags, ApiQuery } from '@nestjs/swagger';

@ApiTags('Notifications')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('notifications')
export class NotificationController {
  constructor(private readonly notificationService: NotificationService) {}

@Get()
  @ApiOperation({ summary: 'Lấy danh sách thông báo (Hỗ trợ tìm kiếm và lọc)' })
  // CẬP NHẬT: Đặt required: false cho các Query parameters trên Swagger
  @ApiQuery({ name: 'keyword', required: false, type: String, description: 'Từ khóa tìm kiếm' })
  @ApiQuery({ name: 'taskId', required: false, type: String, description: 'Lọc theo ID công việc' })
  @ApiQuery({ name: 'isImportant', required: false, type: Boolean, description: 'Lọc thông báo quan trọng' })
  findAll(
    @Request() req,
    @Query('keyword') keyword?: string,
    @Query('taskId') taskId?: string,
    @Query('isImportant') isImportant?: string,
  ) {
    // Truyền đủ 4 tham số xuống Service
    return this.notificationService.getHistory(req.user.id, keyword, taskId, isImportant);
  }

  @Patch('read-all')
  @ApiOperation({ summary: 'Đánh dấu tất cả thông báo là đã đọc' })
  markAllAsRead(@Request() req) {
    return this.notificationService.markAllAsRead(req.user.id);
  }

  @Patch(':id/read')
  @ApiOperation({ summary: 'Đánh dấu thông báo đã đọc' })
  markAsRead(@Request() req, @Param('id') id: string) {
    return this.notificationService.markAsRead(id, req.user.id);
  }
}
