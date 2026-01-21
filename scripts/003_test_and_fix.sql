-- Test and Fix Script for HisaabKitab
-- Run this to verify and fix your database setup

-- 1. Check if tables exist
SELECT 
  tablename,
  schemaname
FROM pg_tables 
WHERE schemaname = 'public' 
  AND tablename IN ('profiles', 'groups', 'group_members', 'expenses', 'customers', 'khata_transactions')
ORDER BY tablename;

-- 2. Check if RLS is enabled
SELECT 
  schemaname,
  tablename,
  rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename IN ('groups', 'group_members', 'expenses')
ORDER BY tablename;

-- 3. Check existing policies
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN ('groups', 'group_members', 'expenses')
ORDER BY tablename, policyname;

-- 4. Check if the helper function exists
SELECT 
  proname,
  prosecdef,
  provolatile
FROM pg_proc
WHERE proname = 'is_group_member_or_creator';

-- 5. Test creating a group (replace YOUR_USER_ID with actual user ID)
-- First, let's see current user
SELECT auth.uid() as current_user_id;

-- If above returns NULL, you're not authenticated
-- If it returns a UUID, you can test insert:
-- INSERT INTO groups (name, type, created_by) 
-- VALUES ('Test Group', 'friends', auth.uid())
-- RETURNING *;
