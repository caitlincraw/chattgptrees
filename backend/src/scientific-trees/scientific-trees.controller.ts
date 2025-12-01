import { Controller, Get, Query, Param } from '@nestjs/common';
import { ScientificTreesService } from './scientific-trees.service';

@Controller('scientific-trees')
export class ScientificTreesController {
  constructor(private readonly scientificTreesService: ScientificTreesService) {}

  @Get('search')
  async search(@Query('q') query: string, @Query('limit') limit?: string) {
    const limitNum = limit ? parseInt(limit, 10) : 20;
    return this.scientificTreesService.searchSpecies(query || '', limitNum);
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.scientificTreesService.findOne(id);
  }

  @Get()
  async findAll() {
    return this.scientificTreesService.findAll();
  }
}

