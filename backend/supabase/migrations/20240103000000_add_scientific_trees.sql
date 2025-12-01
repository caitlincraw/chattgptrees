-- ============================================
-- ADD SCIENTIFIC TREES TABLE AND UPDATE TREES
-- ============================================
-- This migration:
-- 1. Renames trees.name to trees.nickname
-- 2. Creates scientific_trees table
-- 3. Adds scientific_tree_id foreign key to trees table

-- Rename name column to nickname
ALTER TABLE public.trees RENAME COLUMN name TO nickname;

-- Create scientific_trees table
CREATE TABLE IF NOT EXISTS public.scientific_trees (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  scientific_name TEXT NOT NULL UNIQUE,
  common_name TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Enable Row Level Security for scientific_trees
ALTER TABLE public.scientific_trees ENABLE ROW LEVEL SECURITY;

-- Allow anyone to read scientific trees (public data)
CREATE POLICY "Anyone can view scientific trees"
  ON public.scientific_trees
  FOR SELECT
  USING (true);

-- Only authenticated users can insert scientific trees (via API)
CREATE POLICY "Authenticated users can insert scientific trees"
  ON public.scientific_trees
  FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

-- Add scientific_tree_id column to trees table
ALTER TABLE public.trees 
  ADD COLUMN IF NOT EXISTS scientific_tree_id UUID REFERENCES public.scientific_trees(id) ON DELETE SET NULL;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_trees_scientific_tree_id ON public.trees(scientific_tree_id);
CREATE INDEX IF NOT EXISTS idx_scientific_trees_scientific_name ON public.scientific_trees(scientific_name);
CREATE INDEX IF NOT EXISTS idx_scientific_trees_common_name ON public.scientific_trees(common_name);

-- Add updated_at trigger for scientific_trees
CREATE TRIGGER update_scientific_trees_updated_at
  BEFORE UPDATE ON public.scientific_trees
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

