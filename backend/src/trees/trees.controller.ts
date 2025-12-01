import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  UseGuards,
  Request,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { TreesService } from './trees.service';
import { SupabaseJwtGuard } from '../auth/guards/supabase-jwt.guard';
import { CreateTreeDto, UpdateTreeDto } from './dto';

@Controller('trees')
export class TreesController {
  constructor(private readonly treesService: TreesService) {}

  @Get()
  async findAll() {
    return this.treesService.findAll();
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.treesService.findOne(id);
  }

  @Post()
  @UseGuards(SupabaseJwtGuard)
  @HttpCode(HttpStatus.CREATED)
  async create(@Body() createTreeDto: CreateTreeDto, @Request() req) {
    const authHeader = req.headers.authorization;
    const accessToken = authHeader?.replace('Bearer ', '');

    return this.treesService.create(createTreeDto, req.user, accessToken);
  }

  @Put(':id')
  @UseGuards(SupabaseJwtGuard)
  async update(
    @Param('id') id: string,
    @Body() updateTreeDto: UpdateTreeDto,
    @Request() req,
  ) {
    const authHeader = req.headers.authorization;
    const accessToken = authHeader?.replace('Bearer ', '');

    return this.treesService.update(id, updateTreeDto, req.user, accessToken);
  }

  @Delete(':id')
  @UseGuards(SupabaseJwtGuard)
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@Param('id') id: string, @Request() req) {
    const authHeader = req.headers.authorization;
    const accessToken = authHeader?.replace('Bearer ', '');

    return this.treesService.remove(id, req.user, accessToken);
  }
}

