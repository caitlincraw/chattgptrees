import { Injectable, NotFoundException } from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';
import { CreateExampleDto, UpdateExampleDto } from './dto';

@Injectable()
export class ExampleService {
  private readonly tableName = 'examples'; // Change this to your actual table name

  constructor(private supabaseService: SupabaseService) {}

  async findAll() {
    const { data, error } = await this.supabaseService
      .from(this.tableName)
      .select('*');

    if (error) {
      throw new Error(`Failed to fetch examples: ${error.message}`);
    }

    return data;
  }

  async findOne(id: string) {
    const { data, error } = await this.supabaseService
      .from(this.tableName)
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      throw new NotFoundException(`Example with ID ${id} not found`);
    }

    return data;
  }

  async create(createExampleDto: CreateExampleDto) {
    const { data, error } = await this.supabaseService
      .from(this.tableName)
      .insert(createExampleDto)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to create example: ${error.message}`);
    }

    return data;
  }

  async update(id: string, updateExampleDto: UpdateExampleDto) {
    const { data, error } = await this.supabaseService
      .from(this.tableName)
      .update(updateExampleDto)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      throw new NotFoundException(`Example with ID ${id} not found`);
    }

    return data;
  }

  async remove(id: string) {
    const { error } = await this.supabaseService
      .from(this.tableName)
      .delete()
      .eq('id', id);

    if (error) {
      throw new NotFoundException(`Example with ID ${id} not found`);
    }

    return { message: 'Example deleted successfully' };
  }
}
