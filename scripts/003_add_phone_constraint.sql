-- Add unique constraint for phone numbers per user type
-- This ensures:
-- 1. Two personal accounts cannot have the same phone number
-- 2. Two business accounts cannot have the same phone number
-- 3. But one phone can be linked to both a personal AND business account

-- First, clean up any duplicate phone numbers per user_type (keep the first one)
-- This is a safety measure in case there are existing duplicates
DO $$
DECLARE
  duplicate_record RECORD;
BEGIN
  -- Find and handle duplicates for personal accounts
  FOR duplicate_record IN
    SELECT phone, array_agg(id ORDER BY created_at) as user_ids
    FROM public.profiles
    WHERE phone IS NOT NULL 
      AND user_type = 'personal'
    GROUP BY phone
    HAVING COUNT(*) > 1
  LOOP
    -- Keep the first user (oldest), mark others for deletion or update
    UPDATE public.profiles
    SET phone = NULL
    WHERE id = ANY(duplicate_record.user_ids[2:])
      AND phone = duplicate_record.phone
      AND user_type = 'personal';
  END LOOP;

  -- Find and handle duplicates for business accounts
  FOR duplicate_record IN
    SELECT phone, array_agg(id ORDER BY created_at) as user_ids
    FROM public.profiles
    WHERE phone IS NOT NULL 
      AND user_type = 'business'
    GROUP BY phone
    HAVING COUNT(*) > 1
  LOOP
    -- Keep the first user (oldest), mark others for deletion or update
    UPDATE public.profiles
    SET phone = NULL
    WHERE id = ANY(duplicate_record.user_ids[2:])
      AND phone = duplicate_record.phone
      AND user_type = 'business';
  END LOOP;
END $$;

-- Create unique partial index on (phone, user_type) where phone is NOT NULL
-- This allows:
-- - Multiple NULL phones (NULL != NULL in SQL)
-- - One phone per user_type (personal or business)
-- - Same phone for both personal and business (different user_type)
CREATE UNIQUE INDEX IF NOT EXISTS profiles_phone_user_type_unique 
ON public.profiles (phone, user_type) 
WHERE phone IS NOT NULL;

-- Add a comment explaining the constraint
COMMENT ON INDEX profiles_phone_user_type_unique IS 
'Ensures phone numbers are unique per user_type. Allows same phone for both personal and business accounts, but prevents duplicates within the same user_type.';
