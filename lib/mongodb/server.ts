// This file is kept for backward compatibility
// All imports should be updated to use @/lib/auth/auth directly
import { getCurrentUser as getAuthUser } from '@/lib/auth/auth';

export async function getCurrentUser() {
  return await getAuthUser();
}
