import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsString, IsOptional, IsHexColor } from 'class-validator';

export class CreateCategoryDto {
  @ApiProperty({ example: 'Công Việc Học' })
  @IsNotEmpty({ message: 'Tên danh mục không được để trống' })
  @IsString()
  name: string;

  @ApiPropertyOptional({ example: '#8B5CF6', description: 'Màu hex của danh mục' })
  @IsOptional()
  @IsHexColor({ message: 'Màu phải là mã hex hợp lệ' })
  color?: string;
}
