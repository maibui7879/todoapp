import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { StatsService } from './stats.service';
import { StatsController } from './stats.controller';
import { Task, TaskSchema } from '../tasks/entities/task.entity';
import { TasksModule } from '../tasks/tasks.module';
@Module({
  imports: [
    MongooseModule.forFeature([{ name: Task.name, schema: TaskSchema }]),
    TasksModule
  ],
  controllers: [StatsController],
  providers: [StatsService],
})
export class StatsModule {}
