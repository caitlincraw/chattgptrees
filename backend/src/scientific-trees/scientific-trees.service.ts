import { Injectable } from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';

interface GBIFSpecies {
  key: number;
  canonicalName: string;
  vernacularNames?: Array<{ vernacularName: string; language: string }>;
}

@Injectable()
export class ScientificTreesService {
  private readonly tableName = 'scientific_trees';
  private readonly GBIF_API_URL = 'https://api.gbif.org/v1';

  constructor(private supabaseService: SupabaseService) {}

  /**
   * Fetch vernacular names for a species
   */
  private async fetchVernacularNames(speciesKey: number): Promise<string | undefined> {
    try {
      const response = await fetch(
        `${this.GBIF_API_URL}/species/${speciesKey}/vernacularNames`,
      );

      if (!response.ok) {
        return undefined;
      }

      const data = await response.json();
      const vernacularNames = data.results || [];

      // Prioritize English names
      const englishName = vernacularNames.find(
        (v: any) => v.language === 'eng' || v.language === 'en',
      );
      if (englishName) {
        return englishName.vernacularName;
      }

      // Fall back to first available name
      if (vernacularNames.length > 0) {
        return vernacularNames[0].vernacularName;
      }

          return undefined;
        } catch (error) {
          return undefined;
        }
  }

  /**
   * Fetch images for a species from occurrence records
   */
  private async fetchSpeciesImages(speciesKey: number): Promise<string[]> {
    try {
      // Search for occurrences with images
      const response = await fetch(
        `${this.GBIF_API_URL}/occurrence/search?speciesKey=${speciesKey}&mediaType=StillImage&limit=3`,
      );

      if (!response.ok) {
        return [];
      }

      const data = await response.json();
      const images: string[] = [];

      for (const occurrence of data.results || []) {
        if (occurrence.media && Array.isArray(occurrence.media)) {
          for (const media of occurrence.media) {
            if (media.type === 'StillImage' && media.identifier) {
              images.push(media.identifier);
              if (images.length >= 3) break; // Limit to 3 images
            }
          }
        }
        if (images.length >= 3) break;
      }

          return images;
        } catch (error) {
          return [];
        }
  }

  /**
   * Get distribution/habitat info for a species
   */
  private async fetchSpeciesDistribution(
    speciesKey: number,
  ): Promise<{ countries?: string[]; habitats?: string[] }> {
    try {
      // Get species details which may include distribution info
      const response = await fetch(
        `${this.GBIF_API_URL}/species/${speciesKey}`,
      );

      if (!response.ok) {
        return { countries: undefined, habitats: undefined };
      }

      const data = await response.json();
      const countries = new Set<string>();

      // Try to get country distribution from occurrence data
      try {
        const occResponse = await fetch(
          `${this.GBIF_API_URL}/occurrence/search?speciesKey=${speciesKey}&limit=0&facet=country`,
        );
        if (occResponse.ok) {
          const occData = await occResponse.json();
          if (occData.facets && occData.facets[0] && occData.facets[0].counts) {
            occData.facets[0].counts
              .slice(0, 5)
              .forEach((item: any) => countries.add(item.name));
          }
        }
      } catch (e) {
        // Ignore errors for distribution
      }

      return {
        countries: Array.from(countries).slice(0, 5),
          };
        } catch (error) {
          return { countries: undefined, habitats: undefined };
        }
  }

  /**
   * Search for scientific tree names using GBIF API
   * Searches by both scientific name and common name
   */
  async searchSpecies(query: string, limit: number = 20) {
    if (!query || query.trim().length < 2) {
      return [];
    }

    try {
      // Search GBIF API for species matching the query
      // Filter to Plantae kingdom and limit to species rank
      const response = await fetch(
        `${this.GBIF_API_URL}/species/search?q=${encodeURIComponent(query)}&limit=${Math.min(limit * 2, 50)}&status=ACCEPTED&rank=SPECIES&kingdom=Plantae`,
      );

      if (!response.ok) {
        throw new Error('GBIF API request failed');
      }

      const data = await response.json();
      const results: Array<{
        id?: string;
        scientific_name: string;
        common_name?: string;
        family?: string;
        genus?: string;
        images?: string[];
        countries?: string[];
        description?: string;
      }> = [];
      const seenScientificNames = new Set<string>(); // Track unique scientific names

      // Process results (limit to top results to avoid too many API calls)
      const topResults = (data.results || []).slice(0, Math.min(limit, 10)); // Limit to 10 for API performance

      // Fetch additional data for each species in parallel
      const resultsWithData = await Promise.all(
        topResults.map(async (result: any) => {
          const scientificName = result.canonicalName || result.scientificName || result.species;
          if (!scientificName) return null;

          // Skip if we've already seen this scientific name (deduplicate)
          const normalizedName = scientificName.trim().toLowerCase();
          if (seenScientificNames.has(normalizedName)) {
            return null;
          }
          seenScientificNames.add(normalizedName);

          // Fetch additional data in parallel
          const [commonName, images, distribution] = await Promise.all([
            result.key ? this.fetchVernacularNames(result.key) : Promise.resolve(undefined),
            result.key ? this.fetchSpeciesImages(result.key) : Promise.resolve([]),
            result.key
              ? this.fetchSpeciesDistribution(result.key)
              : Promise.resolve({ countries: undefined, habitats: undefined }),
          ]);

          return {
            scientificName,
            commonName,
            family: result.family,
            genus: result.genus,
            key: result.key,
            images: images || [],
            countries: distribution?.countries || [],
            // Get description from higher taxa if available
            description: result.genus
              ? `${result.genus}${result.family ? ` (${result.family} family)` : ''}`
              : undefined,
          };
        }),
      );

      // Filter out nulls and check if results exist in our database
      for (const item of resultsWithData) {
        if (!item) continue;

        // Check if this scientific tree already exists in our database (but don't create it)
        const { data: existing } = await this.supabaseService
          .from(this.tableName)
          .select('id, scientific_name, common_name')
          .eq('scientific_name', item.scientificName)
          .single();

        results.push({
          // Use existing ID if found, otherwise return scientific_name as identifier
          id: existing?.id || item.scientificName, // Use scientific_name as temp ID
          scientific_name: item.scientificName,
          common_name: existing?.common_name || item.commonName || undefined,
          family: item.family,
          genus: item.genus,
          images: item.images && item.images.length > 0 ? item.images : undefined,
          countries: item.countries && item.countries.length > 0 ? item.countries : undefined,
          description: item.description,
        });
      }

      // Sort results: prioritize those with common names, then alphabetically by common name
      results.sort((a, b) => {
        // If one has a common name and the other doesn't, prioritize the one with common name
        if (a.common_name && !b.common_name) return -1;
        if (!a.common_name && b.common_name) return 1;
        // If both have common names, sort alphabetically by common name
        if (a.common_name && b.common_name) {
          return a.common_name.localeCompare(b.common_name);
        }
        // Otherwise sort by scientific name
        return a.scientific_name.localeCompare(b.scientific_name);
      });

          return results.slice(0, limit);
        } catch (error) {
          return this.searchDatabase(query, limit);
        }
  }

  /**
   * Search our database for scientific trees
   */
  async searchDatabase(query: string, limit: number = 20) {
    const searchTerm = `%${query}%`;

    const { data, error } = await this.supabaseService
      .from(this.tableName)
      .select('id, scientific_name, common_name')
      .or(
        `scientific_name.ilike.${searchTerm},common_name.ilike.${searchTerm}`,
      )
      .limit(limit);

    if (error) {
      throw new Error(`Failed to search database: ${error.message}`);
    }

    // Deduplicate by scientific_name (case-insensitive)
    const seen = new Set<string>();
      const uniqueResults: Array<{
        id: string;
        scientific_name: string;
        common_name?: string;
        family?: string;
        genus?: string;
        images?: string[];
        countries?: string[];
        description?: string;
      }> = [];

    for (const tree of data || []) {
      const normalizedName = tree.scientific_name.trim().toLowerCase();
      if (!seen.has(normalizedName)) {
        seen.add(normalizedName);
        uniqueResults.push({
          id: tree.id,
          scientific_name: tree.scientific_name,
          common_name: tree.common_name || undefined,
          family: undefined,
          genus: undefined,
          images: undefined,
          countries: undefined,
          description: undefined,
        });
      }
    }

    return uniqueResults;
  }

  /**
   * Find or create a scientific tree record
   */
  async findOrCreate(scientificName: string, commonName?: string) {
    // First, try to find existing
    const { data: existing } = await this.supabaseService
      .from(this.tableName)
      .select('id, scientific_name, common_name')
      .eq('scientific_name', scientificName)
      .single();

    if (existing) {
      // Update common name if provided and different
      if (commonName && existing.common_name !== commonName) {
        const { data: updated } = await this.supabaseService
          .from(this.tableName)
          .update({ common_name: commonName })
          .eq('id', existing.id)
          .select('id, scientific_name, common_name')
          .single();

        return updated || existing;
      }
      return existing;
    }

    // Create new record
    const { data: newTree, error } = await this.supabaseService
      .from(this.tableName)
      .insert({
        scientific_name: scientificName,
        common_name: commonName || null,
      })
      .select('id, scientific_name, common_name')
      .single();

    if (error) {
      throw new Error(`Failed to create scientific tree: ${error.message}`);
    }

    return newTree;
  }

  /**
   * Get a single scientific tree by ID
   */
  async findOne(id: string) {
    const { data, error } = await this.supabaseService
      .from(this.tableName)
      .select('id, scientific_name, common_name')
      .eq('id', id)
      .single();

    if (error) {
      throw new Error(`Failed to fetch scientific tree: ${error.message}`);
    }

    return data;
  }

  /**
   * Get all scientific trees (for admin/debugging)
   */
  async findAll() {
    const { data, error } = await this.supabaseService
      .from(this.tableName)
      .select('*')
      .order('scientific_name', { ascending: true });

    if (error) {
      throw new Error(`Failed to fetch scientific trees: ${error.message}`);
    }

    return data;
  }
}

