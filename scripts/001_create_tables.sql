-- HisaabKitab Database Schema

-- Profiles table (linked to auth.users)
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT,
  phone TEXT,
  user_type TEXT NOT NULL DEFAULT 'personal' CHECK (user_type IN ('personal', 'business')),
  business_name TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "profiles_select_own" ON public.profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "profiles_insert_own" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "profiles_update_own" ON public.profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "profiles_delete_own" ON public.profiles FOR DELETE USING (auth.uid() = id);

-- Groups table (for expense splitting)
CREATE TABLE IF NOT EXISTS public.groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  type TEXT DEFAULT 'other' CHECK (type IN ('trip', 'home', 'couple', 'friends', 'family', 'work', 'other')),
  created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.groups ENABLE ROW LEVEL SECURITY;

-- Group members table
CREATE TABLE IF NOT EXISTS public.group_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id UUID NOT NULL REFERENCES public.groups(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  is_registered BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.group_members ENABLE ROW LEVEL SECURITY;

-- Expenses table
CREATE TABLE IF NOT EXISTS public.expenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id UUID REFERENCES public.groups(id) ON DELETE CASCADE,
  description TEXT NOT NULL,
  amount DECIMAL(12,2) NOT NULL,
  category TEXT DEFAULT 'other' CHECK (category IN ('food', 'transport', 'shopping', 'entertainment', 'utilities', 'rent', 'medical', 'other')),
  paid_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  split_type TEXT DEFAULT 'equal' CHECK (split_type IN ('equal', 'unequal', 'percentage')),
  date DATE DEFAULT CURRENT_DATE,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;

-- Expense splits table (who owes what)
CREATE TABLE IF NOT EXISTS public.expense_splits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  expense_id UUID NOT NULL REFERENCES public.expenses(id) ON DELETE CASCADE,
  member_id UUID NOT NULL REFERENCES public.group_members(id) ON DELETE CASCADE,
  amount DECIMAL(12,2) NOT NULL,
  is_paid BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.expense_splits ENABLE ROW LEVEL SECURITY;

-- Settlements table
CREATE TABLE IF NOT EXISTS public.settlements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  from_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  to_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  group_id UUID REFERENCES public.groups(id) ON DELETE SET NULL,
  amount DECIMAL(12,2) NOT NULL,
  payment_method TEXT CHECK (payment_method IN ('cash', 'upi', 'bank_transfer', 'other')),
  status TEXT DEFAULT 'completed' CHECK (status IN ('pending', 'completed', 'cancelled')),
  notes TEXT,
  settled_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.settlements ENABLE ROW LEVEL SECURITY;

-- Reminders table
CREATE TABLE IF NOT EXISTS public.reminders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  from_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  to_user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  to_name TEXT,
  to_phone TEXT,
  amount DECIMAL(12,2) NOT NULL,
  message TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'paid', 'cancelled')),
  reminder_type TEXT DEFAULT 'manual' CHECK (reminder_type IN ('manual', 'auto')),
  sent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.reminders ENABLE ROW LEVEL SECURITY;

-- Customers table (for business/khata mode)
CREATE TABLE IF NOT EXISTS public.customers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  phone TEXT,
  email TEXT,
  address TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "customers_select_own" ON public.customers FOR SELECT USING (auth.uid() = owner_id);
CREATE POLICY "customers_insert_own" ON public.customers FOR INSERT WITH CHECK (auth.uid() = owner_id);
CREATE POLICY "customers_update_own" ON public.customers FOR UPDATE USING (auth.uid() = owner_id);
CREATE POLICY "customers_delete_own" ON public.customers FOR DELETE USING (auth.uid() = owner_id);

-- Khata transactions table (udhaar/credit entries)
CREATE TABLE IF NOT EXISTS public.khata_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  customer_id UUID NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('credit', 'payment')),
  amount DECIMAL(12,2) NOT NULL,
  description TEXT,
  date DATE DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.khata_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "khata_select_own" ON public.khata_transactions FOR SELECT USING (auth.uid() = owner_id);
CREATE POLICY "khata_insert_own" ON public.khata_transactions FOR INSERT WITH CHECK (auth.uid() = owner_id);
CREATE POLICY "khata_update_own" ON public.khata_transactions FOR UPDATE USING (auth.uid() = owner_id);
CREATE POLICY "khata_delete_own" ON public.khata_transactions FOR DELETE USING (auth.uid() = owner_id);

-- RLS Policies for groups (members can view groups they belong to)
CREATE POLICY "groups_select" ON public.groups FOR SELECT USING (
  auth.uid() = created_by OR 
  EXISTS (SELECT 1 FROM public.group_members WHERE group_id = groups.id AND user_id = auth.uid())
);
CREATE POLICY "groups_insert" ON public.groups FOR INSERT WITH CHECK (auth.uid() = created_by);
CREATE POLICY "groups_update" ON public.groups FOR UPDATE USING (auth.uid() = created_by);
CREATE POLICY "groups_delete" ON public.groups FOR DELETE USING (auth.uid() = created_by);

-- RLS Policies for group_members
-- Use a SECURITY DEFINER function to avoid infinite recursion in the SELECT policy
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

CREATE POLICY "group_members_select" ON public.group_members FOR SELECT USING (
  public.is_group_member_or_creator(group_members.group_id, auth.uid())
);
CREATE POLICY "group_members_insert" ON public.group_members FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM public.groups WHERE id = group_members.group_id AND created_by = auth.uid())
);
CREATE POLICY "group_members_update" ON public.group_members FOR UPDATE USING (
  EXISTS (SELECT 1 FROM public.groups WHERE id = group_members.group_id AND created_by = auth.uid())
);
CREATE POLICY "group_members_delete" ON public.group_members FOR DELETE USING (
  EXISTS (SELECT 1 FROM public.groups WHERE id = group_members.group_id AND created_by = auth.uid())
);

-- RLS Policies for expenses
CREATE POLICY "expenses_select" ON public.expenses FOR SELECT USING (
  auth.uid() = paid_by OR 
  EXISTS (SELECT 1 FROM public.groups WHERE id = expenses.group_id AND (created_by = auth.uid() OR 
    EXISTS (SELECT 1 FROM public.group_members WHERE group_id = expenses.group_id AND user_id = auth.uid())))
);
CREATE POLICY "expenses_insert" ON public.expenses FOR INSERT WITH CHECK (auth.uid() = paid_by);
CREATE POLICY "expenses_update" ON public.expenses FOR UPDATE USING (auth.uid() = paid_by);
CREATE POLICY "expenses_delete" ON public.expenses FOR DELETE USING (auth.uid() = paid_by);

-- RLS Policies for expense_splits
CREATE POLICY "expense_splits_select" ON public.expense_splits FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.expenses WHERE id = expense_splits.expense_id AND (paid_by = auth.uid() OR 
    EXISTS (SELECT 1 FROM public.groups WHERE id = expenses.group_id AND (created_by = auth.uid() OR 
      EXISTS (SELECT 1 FROM public.group_members WHERE group_id = expenses.group_id AND user_id = auth.uid())))))
);
CREATE POLICY "expense_splits_insert" ON public.expense_splits FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM public.expenses WHERE id = expense_splits.expense_id AND paid_by = auth.uid())
);
CREATE POLICY "expense_splits_update" ON public.expense_splits FOR UPDATE USING (
  EXISTS (SELECT 1 FROM public.expenses WHERE id = expense_splits.expense_id AND paid_by = auth.uid())
);
CREATE POLICY "expense_splits_delete" ON public.expense_splits FOR DELETE USING (
  EXISTS (SELECT 1 FROM public.expenses WHERE id = expense_splits.expense_id AND paid_by = auth.uid())
);

-- RLS Policies for settlements
CREATE POLICY "settlements_select" ON public.settlements FOR SELECT USING (
  auth.uid() = from_user_id OR auth.uid() = to_user_id
);
CREATE POLICY "settlements_insert" ON public.settlements FOR INSERT WITH CHECK (
  auth.uid() = from_user_id OR auth.uid() = to_user_id
);
CREATE POLICY "settlements_update" ON public.settlements FOR UPDATE USING (
  auth.uid() = from_user_id OR auth.uid() = to_user_id
);
CREATE POLICY "settlements_delete" ON public.settlements FOR DELETE USING (
  auth.uid() = from_user_id
);

-- RLS Policies for reminders
CREATE POLICY "reminders_select" ON public.reminders FOR SELECT USING (
  auth.uid() = from_user_id OR auth.uid() = to_user_id
);
CREATE POLICY "reminders_insert" ON public.reminders FOR INSERT WITH CHECK (auth.uid() = from_user_id);
CREATE POLICY "reminders_update" ON public.reminders FOR UPDATE USING (auth.uid() = from_user_id);
CREATE POLICY "reminders_delete" ON public.reminders FOR DELETE USING (auth.uid() = from_user_id);

-- Trigger to auto-create profile on user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, phone, user_type, business_name)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data ->> 'full_name', NULL),
    COALESCE(NEW.raw_user_meta_data ->> 'phone', NULL),
    COALESCE(NEW.raw_user_meta_data ->> 'user_type', 'personal'),
    COALESCE(NEW.raw_user_meta_data ->> 'business_name', NULL)
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();
