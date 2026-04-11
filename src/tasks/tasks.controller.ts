import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, Request, Query } from '@nestjs/common';
import { TasksService } from './tasks.service';
import { CreateTaskDto } from './dto/create-task.dto';
import { UpdateTaskDto } from './dto/update-task.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiResponse, ApiTags } from '@nestjs/swagger';

@ApiTags('tasks')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('tasks')
export class TasksController {
  constructor(private readonly tasksService: TasksService) {}

  @Post()
  @ApiOperation({ summary: 'Tạo công việc mới (hỗ trợ tạo luật lặp lại)' })
  @ApiResponse({ status: 201, description: 'Tạo công việc thành công' })
  create(@Request() req, @Body() createTaskDto: CreateTaskDto) {
    return this.tasksService.create(req.user.id, createTaskDto);
  }

  // --- API MỚI CHO VIRTUAL INTERPOLATION ---
  @Post('realize/:masterId')
  @ApiOperation({ summary: 'Biến task Ảo thành task Thật khi user tick hoàn thành hoặc sửa thông tin' })
  @ApiResponse({ status: 201, description: 'Task ảo được thực hóa thành công' })
  realizeVirtualTask(
    @Request() req, 
    @Param('masterId') masterId: string, 
    @Query('dueDate') dueDate: string,
    @Body() updateTaskDto: UpdateTaskDto
  ) {
    return this.tasksService.realizeVirtualTask(req.user.id, masterId, dueDate, updateTaskDto);
  }
  // ------------------------------------------

  @Get()
  @ApiOperation({ summary: 'Lấy danh sách công việc (Sinh Task ảo nếu có ngày)' })
  @ApiQuery({ name: 'date', required: false, type: String, example: '2026-04-12' })
  @ApiQuery({ name: 'isCompleted', required: false, type: Boolean, example: false, description: 'Lọc theo trạng thái hoàn thành' })
  @ApiResponse({ status: 200, description: 'Danh sách công việc' })
  findAll(@Request() req, @Query('date') date?: string, @Query('isCompleted') isCompleted?: string) {
    return this.tasksService.findAll(req.user.id, date, isCompleted);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Lấy chi tiết một công việc' })
  @ApiResponse({ status: 200, description: 'Chi tiết công việc' })
  findOne(@Request() req, @Param('id') id: string) {
    return this.tasksService.findOne(id, req.user.id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Cập nhật công việc (hoặc đánh dấu hoàn thành)' })
  @ApiResponse({ status: 200, description: 'Công việc được cập nhật' })
  update(@Request() req, @Param('id') id: string, @Body() updateTaskDto: UpdateTaskDto) {
    return this.tasksService.update(id, req.user.id, updateTaskDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Xóa công việc' })
  @ApiResponse({ status: 200, description: 'Công việc được xóa' })
  remove(@Request() req, @Param('id') id: string) {
    return this.tasksService.remove(id, req.user.id);
  }
}
