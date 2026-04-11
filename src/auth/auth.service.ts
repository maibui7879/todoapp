import { Injectable, UnauthorizedException, BadRequestException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { UsersService } from '../users/users.service';
import { RegisterDto, LoginDto } from './dto/auth.dto';

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
  ) {}

  // 1. Logic Đăng ký
  async register(registerDto: RegisterDto) {
    const { email, password, fullName } = registerDto;

    // Kiểm tra email tồn tại
    const existingUser = await this.usersService.findByEmail(email);
    if (existingUser) {
      throw new BadRequestException('Email này đã được sử dụng');
    }

    // Mã hóa mật khẩu (Hash)
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    // Tạo user mới
    const newUser = await this.usersService.create({
      email,
      password: hashedPassword,
      fullName,
    });

    return { message: 'Đăng ký thành công', userId: newUser._id };
  }

  // 2. Logic Đăng nhập
  async login(loginDto: LoginDto) {
    const { email, password } = loginDto;

    // Tìm user theo email
    const user = await this.usersService.findByEmail(email);
    if (!user) {
      throw new UnauthorizedException('Email hoặc mật khẩu không đúng');
    }

    // So sánh mật khẩu người dùng nhập với mật khẩu đã hash trong DB
    const isPasswordMatching = await bcrypt.compare(password, user.password);
    if (!isPasswordMatching) {
      throw new UnauthorizedException('Email hoặc mật khẩu không đúng');
    }

    // Nếu đúng, tạo JWT Token
    const payload = { sub: user._id, email: user.email };
    const token = this.jwtService.sign(payload);

    return {
      message: 'Đăng nhập thành công',
      accessToken: token,
      user: {
        id: user._id,
        email: user.email,
        fullName: user.fullName,
        avatarUrl: user.avatarUrl,
      }
    };
  }
}
