import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { User, UserDocument } from './entities/user.entity';
import { UpdateProfileDto } from './dto/update-profile.dto';

@Injectable()
export class UsersService {
  constructor(@InjectModel(User.name) private userModel: Model<UserDocument>) {}

  // 1. Hàm này dùng nội bộ cho AuthModule (Đăng nhập/Đăng ký)
  async findByEmail(email: string): Promise<UserDocument | null> {
    return this.userModel.findOne({ email }).exec();
  }

  // 2. Hàm này cũng dùng cho AuthModule khi Đăng ký mới
  async create(createData: any): Promise<UserDocument> {
    const newUser = new this.userModel(createData);
    return newUser.save();
  }

  // 3. Lấy thông tin User hiện tại (Ẩn password)
  async findById(userId: string): Promise<User> {
    const user = await this.userModel
      .findById(new Types.ObjectId(userId))
      .select('-password') // Không trả về trường password
      .exec();

    if (!user) throw new NotFoundException('Không tìm thấy người dùng');
    return user;
  }

  // 4. Cập nhật thông tin cá nhân
  async updateProfile(userId: string, updateProfileDto: UpdateProfileDto): Promise<User> {
    const updatedUser = await this.userModel.findByIdAndUpdate(
      new Types.ObjectId(userId),
      { $set: updateProfileDto },
      { new: true } // Trả về data mới nhất sau khi update
    )
    .select('-password')
    .exec();

    if (!updatedUser) throw new NotFoundException('Không tìm thấy người dùng để cập nhật');
    
    return updatedUser;
  }
}
