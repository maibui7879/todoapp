import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsDateString, IsEnum, IsNotEmpty, IsNumber, IsOptional, IsString } from 'class-validator';
import { RepeatUnit } from '../entities/task.entity';

export class CreateTaskDto {
  @ApiProperty({ example: 'Chống đẩy 20 phút' })
  @IsNotEmpty()
  @IsString()
  title: string;

  @ApiPropertyOptional({ example: 'Giữ streak rèn luyện sức khỏe' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ example: '2026-04-12T08:00:00.000Z' })
  @IsNotEmpty()
  @IsDateString()
  dueDate: string;

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
}
