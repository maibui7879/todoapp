import { Controller, Get, Query, Request, UseGuards, BadRequestException } from '@nestjs/common';
import { StatsService } from './stats.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';

@ApiTags('Stats')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('stats')
export class StatsController {
  constructor(private readonly statsService: StatsService) {}

  @Get()
  @ApiOperation({ summary: 'Lấy thống kê chi tiết theo tuần, tháng hoặc năm' })
  // 1. Thêm 'year' vào enum của Swagger
  @ApiQuery({ name: 'type', enum: ['week', 'month', 'year'], description: 'Phạm vi thống kê (week/month/year)' })
  @ApiQuery({ name: 'date', required: false, description: 'Ngày làm mốc (YYYY-MM-DD), mặc định là hôm nay' })
  getDetailedStats(
    @Request() req,
    // 2. Thêm 'year' vào type TS
    @Query('type') type: 'week' | 'month' | 'year',
    @Query('date') dateStr?: string,
  ) {
    // 3. Sửa lại điều kiện validate để cho phép 'year' lọt qua
    if (!type || !['week', 'month', 'year'].includes(type)) {
      throw new BadRequestException('Tham số type bắt buộc phải là "week", "month" hoặc "year"');
    }
    return this.statsService.getDetailedStats(req.user.id, type, dateStr);
  }
}