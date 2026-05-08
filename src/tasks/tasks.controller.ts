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
  @ApiOperation({ summary: 'Lấy danh sách công việc (hỗ trợ bộ lọc)' })
  @ApiQuery({ name: 'startDate', required: false, type: String, example: '2026-04-01' })
  @ApiQuery({ name: 'endDate', required: false, type: String, example: '2026-04-30' })
  @ApiQuery({ name: 'isCompleted', required: false, type: Boolean })
  @ApiQuery({ name: 'isImportant', required: false, type: Boolean, description: 'Lọc task quan trọng (gắn sao)' })
  @ApiQuery({ name: 'isOverdue', required: false, type: Boolean, description: 'Lọc task quá hạn & chưa hoàn thành' })
  findAll(
    @Request() req, 
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('isCompleted') isCompleted?: string,
    @Query('isImportant') isImportant?: string,
    @Query('isOverdue') isOverdue?: string
  ) {
    return this.tasksService.findAll(
      req.user.id, 
      startDate, 
      endDate, 
      isCompleted, 
      isImportant, 
      isOverdue
    );
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

  @Patch(':id/important')
  @ApiOperation({ summary: 'Đánh dấu quan trọng (Tự động Realize nếu là Task ảo)' })
  markAsImportant(
    @Request() req,
    @Param('id') id: string,
    @Body('isImportant') isImportant: boolean,
  ) {
    return this.tasksService.markAsImportant(id, req.user.id, isImportant);
  }
}
