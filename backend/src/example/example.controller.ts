import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ExampleService } from './example.service';
import { CreateExampleDto, UpdateExampleDto } from './dto';

@Controller('example')
export class ExampleController {
  constructor(private readonly exampleService: ExampleService) {}

  @Get()
  async findAll() {
    return this.exampleService.findAll();
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.exampleService.findOne(id);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(@Body() createExampleDto: CreateExampleDto) {
    return this.exampleService.create(createExampleDto);
  }

  @Put(':id')
  async update(
    @Param('id') id: string,
    @Body() updateExampleDto: UpdateExampleDto,
  ) {
    return this.exampleService.update(id, updateExampleDto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@Param('id') id: string) {
    return this.exampleService.remove(id);
  }
}
