import { getCurrentUser as getAuthUser } from '@/lib/auth/auth';

export async function getCurrentUser() {
  return await getAuthUser();
}
