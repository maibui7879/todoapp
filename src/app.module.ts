// src/app.module.ts
import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { TasksModule } from './tasks/tasks.module';
import { UsersModule } from './users/users.module';
import { CategoriesModule } from './categories/categories.module';
import { AuthModule } from './auth/auth.module';
import { StatsModule } from './stats/stats.module';
import { NotificationModule } from './notification/notification.module';

@Module({
  imports: [
    // Tải file .env
    ConfigModule.forRoot({
      isGlobal: true, 
    }),
    // Kích hoạt Cron Job support
    ScheduleModule.forRoot(),
    // Kết nối MongoDB bằng chuỗi URI trong .env
    MongooseModule.forRoot(process.env.MONGODB_URI||'mongodb://localhost:27017/todolist', ),
    TasksModule,
    UsersModule,
    CategoriesModule,
    AuthModule,
    StatsModule,
    NotificationModule,
  ],
})
export class AppModule {}
