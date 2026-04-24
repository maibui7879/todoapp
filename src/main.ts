import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
   app.enableCors();
  // Bật tính năng validate dữ liệu toàn cầu
  app.useGlobalPipes(new ValidationPipe({
    whitelist: true, // Tự động loại bỏ các trường dữ liệu rác
    forbidNonWhitelisted: true, // Báo lỗi nếu có trường rác
  }));

  // Cấu hình Swagger
  const config = new DocumentBuilder()
    .setTitle('Todo App API')
    .setDescription('API documentation cho ứng dụng Todo List')
    .setVersion('1.0')
    .addBearerAuth()
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api', app, document);

  await app.listen(process.env.PORT ?? 3000);
  console.log(`Application is running on: http://localhost:3000`);
  console.log(`Swagger documentation available at: http://localhost:3000/api`);
}
bootstrap();
