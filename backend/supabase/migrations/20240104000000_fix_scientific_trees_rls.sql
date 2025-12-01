-- ============================================
-- FIX SCIENTIFIC TREES RLS POLICY
-- ============================================
-- Allow inserts without authentication since scientific_trees
-- is public reference data that the backend needs to populate

-- Drop the existing insert policy
DROP POLICY IF EXISTS "Authenticated users can insert scientific trees" ON public.scientific_trees;

-- Create a new policy that allows anyone to insert (for backend API use)
-- This is safe because scientific_name has a UNIQUE constraint
CREATE POLICY "Anyone can insert scientific trees"
  ON public.scientific_trees
  FOR INSERT
  WITH CHECK (true);

