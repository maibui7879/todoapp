import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Category, CategoryDocument } from './entities/category.entity';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';

@Injectable()
export class CategoriesService {
  constructor(@InjectModel(Category.name) private categoryModel: Model<CategoryDocument>) {}

  async create(userId: string, createCategoryDto: CreateCategoryDto): Promise<Category> {
    const newCategory = new this.categoryModel({
      ...createCategoryDto,
      userId: new Types.ObjectId(userId),
    });
    return newCategory.save();
  }

  async findAll(userId: string): Promise<Category[]> {
    return this.categoryModel.find({ userId: new Types.ObjectId(userId) }).exec();
  }

  async findOne(id: string, userId: string): Promise<Category> {
    const category = await this.categoryModel.findOne({
      _id: new Types.ObjectId(id),
      userId: new Types.ObjectId(userId),
    }).exec();

    if (!category) throw new NotFoundException('Không tìm thấy danh mục này');
    return category;
  }

  async update(id: string, userId: string, updateCategoryDto: UpdateCategoryDto): Promise<Category> {
    const updatedCategory = await this.categoryModel.findOneAndUpdate(
      { _id: new Types.ObjectId(id), userId: new Types.ObjectId(userId) },
      { $set: updateCategoryDto },
      { new: true }
    ).exec();

    if (!updatedCategory) {
      throw new NotFoundException('Không tìm thấy danh mục để cập nhật');
    }
    return updatedCategory;
  }

  async remove(id: string, userId: string): Promise<{ message: string }> {
    const result = await this.categoryModel.deleteOne({
      _id: new Types.ObjectId(id),
      userId: new Types.ObjectId(userId),
    }).exec();

    if (result.deletedCount === 0) {
      throw new NotFoundException('Không tìm thấy danh mục để xóa');
    }
    
    return { message: 'Đã xóa danh mục thành công' };
  }
}
