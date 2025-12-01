import { Module } from '@nestjs/common';
import { ScientificTreesController } from './scientific-trees.controller';
import { ScientificTreesService } from './scientific-trees.service';
import { SupabaseModule } from '../supabase/supabase.module';

@Module({
  imports: [SupabaseModule],
  controllers: [ScientificTreesController],
  providers: [ScientificTreesService],
  exports: [ScientificTreesService],
})
export class ScientificTreesModule {}

