import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, IsUrl } from 'class-validator';

export class UpdateProfileDto {
  @ApiPropertyOptional({ example: 'Bùi Đức Mạnh' })
  @IsOptional()
  @IsString()
  fullName?: string;

  @ApiPropertyOptional({ example: 'https://res.cloudinary.com/xyz/image.jpg' })
  @IsOptional()
  @IsUrl({}, { message: 'Avatar phải là một đường dẫn URL hợp lệ' })
  avatarUrl?: string;
}
