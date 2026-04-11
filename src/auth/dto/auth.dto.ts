import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsOptional, IsString, MinLength } from 'class-validator';

export class RegisterDto {
  @ApiProperty({ example: 'manh.bui@example.com' })
  @IsEmail({}, { message: 'Email không đúng định dạng' })
  email: string;

  @ApiProperty({ example: '12345678', description: 'Mật khẩu ít nhất 6 ký tự' })
  @IsString()
  @MinLength(6, { message: 'Mật khẩu phải có ít nhất 6 ký tự' })
  password: string;

  @ApiPropertyOptional({ example: 'Bùi Đức Mạnh' })
  @IsOptional()
  @IsString()
  fullName?: string;
}

export class LoginDto {
  @ApiProperty({ example: 'manh.bui@example.com' })
  @IsEmail({}, { message: 'Email không đúng định dạng' })
  email: string;

  @ApiProperty({ example: '12345678' })
  @IsString()
  @IsNotEmpty({ message: 'Không được để trống mật khẩu' })
  password: string;
}
