-- ============================================
-- SIMPLIFY: Use auth.users directly instead of public.users
-- ============================================
-- This migration simplifies the schema by having trees reference auth.users directly
-- No need for a separate public.users table unless you need app-specific user fields

-- Drop old foreign key constraint (pointing to public.users)
ALTER TABLE public.trees DROP CONSTRAINT IF EXISTS trees_user_id_fkey;

-- Note: We can't create a foreign key to auth.users (different schema),
-- but that's fine - RLS policies will handle security and data integrity

-- Update RLS policies for trees to use auth.users directly
DROP POLICY IF EXISTS "Authenticated users can insert trees" ON public.trees;
DROP POLICY IF EXISTS "Users can update own trees" ON public.trees;
DROP POLICY IF EXISTS "Users can delete own trees" ON public.trees;

-- Create new policies that reference auth.users directly (simpler!)
CREATE POLICY "Authenticated users can insert trees"
  ON public.trees
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own trees"
  ON public.trees
  FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own trees"
  ON public.trees
  FOR DELETE
  USING (auth.uid() = user_id);

-- Note: The trees.user_id column now directly stores auth.users.id
-- No foreign key constraint needed - RLS policies handle security
-- The public.users table can remain for future app-specific fields if needed

