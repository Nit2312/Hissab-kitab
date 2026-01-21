-- TEMPORARY: Disable RLS for testing
-- WARNING: This disables security. Only use for testing locally!
-- Re-enable RLS after testing

-- Disable RLS temporarily
ALTER TABLE public.groups DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.group_members DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.expenses DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.expense_splits DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.customers DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.khata_transactions DISABLE ROW LEVEL SECURITY;

-- To re-enable later, run:
-- ALTER TABLE public.groups ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE public.group_members ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE public.expense_splits ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE public.khata_transactions ENABLE ROW LEVEL SECURITY;
