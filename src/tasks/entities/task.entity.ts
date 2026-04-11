import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type TaskDocument = Task & Document;

export enum RepeatUnit {
  NONE = 'NONE',
  DAILY = 'DAILY',
  WEEKLY = 'WEEKLY',
  MONTHLY = 'MONTHLY',
  YEARLY = 'YEARLY',
  FIXED_DAYS = 'FIXED_DAYS',
}

@Schema({ timestamps: true })
export class Task {
  @Prop({ required: true })
  title!: string;

  @Prop()
  description?: string;

  @Prop({ required: true })
  dueDate!: Date;

  @Prop({ default: false })
  isCompleted!: boolean;

  // --- CÁC TRƯỜNG CHO TÍNH NĂNG LẶP LẠI (VIRTUAL INTERPOLATION) ---
  @Prop({ default: false })
  isMaster?: boolean; // Đánh dấu đây là bản ghi quy tắc lặp lại

  @Prop({ type: String, enum: RepeatUnit, default: RepeatUnit.NONE })
  repeatUnit?: string;

  @Prop({ default: 1 })
  repeatInterval?: number;

  @Prop()
  startDate?: Date; // Ngày bắt đầu chu kỳ lặp lại

  @Prop({ type: Types.ObjectId, ref: 'Task' })
  masterId?: Types.ObjectId; // Trỏ về bản ghi gốc nếu đây là task THẬT được tạo từ task ẢO
  // ----------------------------------------------------------------

  @Prop({ type: Types.ObjectId, ref: 'Category' })
  categoryId?: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  userId!: Types.ObjectId;
}

export const TaskSchema = SchemaFactory.createForClass(Task);
