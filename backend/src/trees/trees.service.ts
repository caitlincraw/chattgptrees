import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';
import { CreateTreeDto, UpdateTreeDto } from './dto';
import { ScientificTreesService } from '../scientific-trees/scientific-trees.service';

@Injectable()
export class TreesService {
  private readonly tableName = 'trees';

  constructor(
    private supabaseService: SupabaseService,
    private scientificTreesService: ScientificTreesService,
  ) {}

  async findAll() {
    const { data, error } = await this.supabaseService
      .from(this.tableName)
      .select(
        `
        *,
        scientific_tree:scientific_trees(id, scientific_name, common_name)
      `,
      )
      .order('created_at', { ascending: false });

    if (error) {
      throw new Error(`Failed to fetch trees: ${error.message}`);
    }

    return data;
  }

  async findOne(id: string) {
    const { data, error } = await this.supabaseService
      .from(this.tableName)
      .select(
        `
        *,
        scientific_tree:scientific_trees(id, scientific_name, common_name)
      `,
      )
      .eq('id', id)
      .single();

    if (error) {
      throw new NotFoundException(`Tree with ID ${id} not found`);
    }

    return data;
  }

  async create(
    createTreeDto: CreateTreeDto,
    authUser: { id: string; email: string; full_name?: string },
    accessToken?: string,
  ) {
    const insertData: any = {
      user_id: authUser.id,
      nickname: createTreeDto.nickname,
      description: createTreeDto.description || null,
      latitude: createTreeDto.latitude,
      longitude: createTreeDto.longitude,
    };
    if (
      createTreeDto.scientific_tree_id !== undefined &&
      createTreeDto.scientific_tree_id !== null &&
      createTreeDto.scientific_tree_id !== ''
    ) {
      const scientificTreeIdOrName = String(
        createTreeDto.scientific_tree_id,
      ).trim();

      const uuidRegex =
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

      if (uuidRegex.test(scientificTreeIdOrName)) {
        const { data: existing } = await this.supabaseService
          .from('scientific_trees')
          .select('id')
          .eq('id', scientificTreeIdOrName)
          .single();

        if (existing) {
          insertData.scientific_tree_id = scientificTreeIdOrName;
        } else {
          throw new BadRequestException(
            `Scientific tree with ID ${scientificTreeIdOrName} not found.`,
          );
        }
      } else {
        const scientificTree = await this.scientificTreesService.findOrCreate(
          scientificTreeIdOrName,
          undefined,
        );
        insertData.scientific_tree_id = scientificTree.id;
      }
    } else {
      insertData.scientific_tree_id = null;
    }

    const client = accessToken
      ? this.supabaseService.getClientWithAuth(accessToken)
      : this.supabaseService.getClient();
    const { data, error } = await client
      .from(this.tableName)
      .insert(insertData)
      .select(
        `
        *,
        scientific_tree:scientific_trees(id, scientific_name, common_name)
      `,
      )
      .single();

    if (error) {
      throw new Error(`Failed to create tree: ${error.message}`);
    }

    return data;
  }

  async update(
    id: string,
    updateTreeDto: UpdateTreeDto,
    authUser: { id: string; email: string; full_name?: string },
    accessToken?: string,
  ) {
    const tree = await this.findOne(id);

    if (tree.user_id !== authUser.id) {
      throw new ForbiddenException('You can only update your own trees');
    }
    const updateData: any = {};
    if (updateTreeDto.nickname !== undefined) {
      updateData.nickname = updateTreeDto.nickname;
    }
    if (updateTreeDto.description !== undefined) {
      updateData.description = updateTreeDto.description;
    }
    if (updateTreeDto.scientific_tree_id !== undefined) {
      const scientificTreeIdOrName =
        updateTreeDto.scientific_tree_id === null ||
        updateTreeDto.scientific_tree_id === '' ||
        updateTreeDto.scientific_tree_id === 'null'
          ? null
          : String(updateTreeDto.scientific_tree_id).trim();

      if (scientificTreeIdOrName === null) {
        updateData.scientific_tree_id = null;
      } else {
        const uuidRegex =
          /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

        if (uuidRegex.test(scientificTreeIdOrName)) {
          const { data: existing } = await this.supabaseService
            .from('scientific_trees')
            .select('id')
            .eq('id', scientificTreeIdOrName)
            .single();

          if (existing) {
            updateData.scientific_tree_id = scientificTreeIdOrName;
          } else {
            throw new BadRequestException(
              `Scientific tree with ID ${scientificTreeIdOrName} not found.`,
            );
          }
        } else {
          const scientificTree = await this.scientificTreesService.findOrCreate(
            scientificTreeIdOrName,
            undefined,
          );
          updateData.scientific_tree_id = scientificTree.id;
        }
      }
    }
    if (updateTreeDto.latitude !== undefined) {
      updateData.latitude = updateTreeDto.latitude;
    }
    if (updateTreeDto.longitude !== undefined) {
      updateData.longitude = updateTreeDto.longitude;
    }

    const client = accessToken
      ? this.supabaseService.getClientWithAuth(accessToken)
      : this.supabaseService.getClient();

    const { error: updateError } = await client
      .from(this.tableName)
      .update(updateData)
      .eq('id', id);

    if (updateError) {
      throw new Error(`Failed to update tree: ${updateError.message}`);
    }

    const { data, error: selectError } = await this.supabaseService
      .from(this.tableName)
      .select(
        `
        *,
        scientific_tree:scientific_trees(id, scientific_name, common_name)
      `,
      )
      .eq('id', id)
      .single();

    if (selectError) {
      throw new Error(`Failed to fetch updated tree: ${selectError.message}`);
    }

    if (!data) {
      throw new NotFoundException(`Tree with ID ${id} not found after update`);
    }

    return data;
  }

  async remove(
    id: string,
    authUser: { id: string; email: string; full_name?: string },
    accessToken?: string,
  ) {
    const tree = await this.findOne(id);

    if (tree.user_id !== authUser.id) {
      throw new ForbiddenException('You can only delete your own trees');
    }

    const client = accessToken
      ? this.supabaseService.getClientWithAuth(accessToken)
      : this.supabaseService.getClient();

    const { error } = await client.from(this.tableName).delete().eq('id', id);

    if (error) {
      throw new Error(`Failed to delete tree: ${error.message}`);
    }

    return { message: 'Tree deleted successfully' };
  }
}
