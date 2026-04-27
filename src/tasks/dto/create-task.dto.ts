import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsArray, IsBoolean, IsDateString, IsEnum, IsNotEmpty, IsNumber, IsOptional, IsString } from 'class-validator';
import { RepeatUnit } from '../entities/task.entity';

export class CreateTaskDto {
  @ApiProperty({ example: 'Chống đẩy 20 phút' })
  @IsNotEmpty()
  @IsString()
  title!: string;

  @ApiPropertyOptional({ example: 'Giữ streak rèn luyện sức khỏe' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ example: '2026-04-12T08:00:00.000Z' })
  @IsNotEmpty()
  @IsDateString()
  dueDate!: string;

    @ApiProperty({ description: 'Ngày bắt đầu chu kỳ lặp lại', required: false })
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiProperty({ description: 'Ngày kết thúc chu kỳ lặp lại', required: false })
  @IsOptional()
  @IsDateString()
  endRepeatDate?: string;

  @ApiPropertyOptional({ example: 'Sức khỏe' })
  @IsOptional()
  @IsString()
  categoryName?: string;

  // Cấu hình lặp lại
  @ApiPropertyOptional({ default: false, description: 'Bật true nếu muốn task này lặp lại' })
  @IsOptional()
  @IsBoolean()
  isMaster?: boolean;

  @ApiPropertyOptional({ enum: RepeatUnit, default: RepeatUnit.NONE })
  @IsOptional()
  @IsEnum(RepeatUnit)
  repeatUnit?: RepeatUnit;

  @ApiPropertyOptional({ example: 1, description: 'Lặp lại mỗi X đơn vị' })
  @IsOptional()
  @IsNumber()
  repeatInterval?: number;

  @ApiPropertyOptional({ 
    example: [1, 3, 5], 
    description: 'Mảng các thứ trong tuần lặp lại dùng cho FIXED_DAYS (0=CN, 1=T2, 2=T3, 3=T4, 4=T5, 5=T6, 6=T7)' 
  })
  @IsOptional()
  @IsArray()
  @IsNumber({}, { each: true })
  repeatDays?: number[];

  @ApiPropertyOptional({ default: false, description: 'Đánh dấu công việc quan trọng' })
  @IsOptional()
  @IsBoolean()
  isImportant?: boolean;
}
