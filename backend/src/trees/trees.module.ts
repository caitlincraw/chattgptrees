import { Module } from '@nestjs/common';
import { TreesController } from './trees.controller';
import { TreesService } from './trees.service';
import { SupabaseJwtGuard } from '../auth/guards/supabase-jwt.guard';
import { SupabaseModule } from '../supabase/supabase.module';
import { ScientificTreesModule } from '../scientific-trees/scientific-trees.module';

@Module({
  imports: [SupabaseModule, ScientificTreesModule],
  controllers: [TreesController],
  providers: [TreesService, SupabaseJwtGuard],
})
export class TreesModule {}
