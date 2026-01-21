-- Fix RLS Policies for group_members to prevent infinite recursion
-- The issue: The SELECT policy queries group_members, causing recursion during INSERT
-- Solution: Use a SECURITY DEFINER function to bypass RLS for the membership check

-- Drop existing policies
DROP POLICY IF EXISTS "group_members_select" ON public.group_members;
DROP POLICY IF EXISTS "group_members_insert" ON public.group_members;
DROP POLICY IF EXISTS "group_members_update" ON public.group_members;
DROP POLICY IF EXISTS "group_members_delete" ON public.group_members;

-- Create a helper function that checks membership without RLS recursion
-- SECURITY DEFINER allows the function to bypass RLS when checking membership
CREATE OR REPLACE FUNCTION public.is_group_member_or_creator(group_uuid UUID, user_uuid UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
DECLARE
  is_creator BOOLEAN;
  is_member BOOLEAN;
BEGIN
  -- Check if user is group creator (bypasses RLS)
  SELECT EXISTS (
    SELECT 1 FROM public.groups 
    WHERE id = group_uuid 
    AND created_by = user_uuid
  ) INTO is_creator;
  
  IF is_creator THEN
    RETURN TRUE;
  END IF;
  
  -- Check if user is a member (bypasses RLS due to SECURITY DEFINER)
  SELECT EXISTS (
    SELECT 1 FROM public.group_members
    WHERE group_id = group_uuid
    AND user_id = user_uuid
  ) INTO is_member;
  
  RETURN is_member;
END;
$$;

-- Recreate SELECT policy using the function to avoid recursion
CREATE POLICY "group_members_select" ON public.group_members FOR SELECT USING (
  public.is_group_member_or_creator(group_members.group_id, auth.uid())
);

-- INSERT: Only group creator can add members
CREATE POLICY "group_members_insert" ON public.group_members FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.groups 
    WHERE id = group_members.group_id 
    AND created_by = auth.uid()
  )
);

-- UPDATE: Only group creator can update members
CREATE POLICY "group_members_update" ON public.group_members FOR UPDATE USING (
  EXISTS (
    SELECT 1 FROM public.groups 
    WHERE id = group_members.group_id 
    AND created_by = auth.uid()
  )
);

-- DELETE: Only group creator can delete members
CREATE POLICY "group_members_delete" ON public.group_members FOR DELETE USING (
  EXISTS (
    SELECT 1 FROM public.groups 
    WHERE id = group_members.group_id 
    AND created_by = auth.uid()
  )
);
