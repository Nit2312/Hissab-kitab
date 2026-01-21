import { getCurrentUser as getAuthUser } from '@/lib/auth/auth';

export async function createClient() {
  return {
    auth: {
      getUser: async () => {
        const user = await getAuthUser();
        return {
          data: { user },
          error: user ? null : { message: 'Not authenticated' },
        };
      },
    },
  };
}

export async function getCurrentUser() {
  return await getAuthUser();
}
