import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type NotificationDocument = Notification & Document;

@Schema({ timestamps: true }) // Tự động có createdAt, updatedAt
export class Notification {
  @Prop({ required: true })
  title!: string;

  @Prop({ required: true })
  message!: string;

  @Prop({ default: false })
  isRead!: boolean; // Trạng thái chưa đọc / đã đọc

  // Lưu lại ID của công việc để khi click vào thông báo, FE biết đường mở chi tiết task đó ra
  @Prop({ type: String }) 
  taskId?: string;

  // ID của người nhận thông báo
  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  userId!: Types.ObjectId;
}

export const NotificationSchema = SchemaFactory.createForClass(Notification);
