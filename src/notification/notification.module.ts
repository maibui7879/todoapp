import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { NotificationService } from './notification.service';
import { NotificationController } from './notification.controller';
import { NotificationGateway } from './notification.gateway'; // Import Gateway
import { Notification, NotificationSchema } from './entities/notification.entity';
import { Task, TaskSchema } from '../tasks/entities/task.entity';

@Module({
  imports: [
    // Phải import cả TaskSchema thì CronJob mới tìm được Task
    MongooseModule.forFeature([
      { name: Notification.name, schema: NotificationSchema },
      { name: Task.name, schema: TaskSchema }
    ])
  ],
  controllers: [NotificationController],
  providers: [NotificationService, NotificationGateway], // Cung cấp Gateway cho Module
})
export class NotificationModule {}
