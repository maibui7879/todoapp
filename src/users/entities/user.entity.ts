import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type UserDocument = User & Document;

@Schema({ timestamps: true })
export class User {
  @Prop({ required: true, unique: true })
  email!: string;

  @Prop({ required: true })
  password!: string;

  @Prop()
  fullName!: string;

  @Prop()
  avatarUrl!: string; // Lưu link ảnh (Cloudinary do FE gửi lên)
}

export const UserSchema = SchemaFactory.createForClass(User);
