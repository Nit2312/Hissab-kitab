'use client';

export interface AuthUser {
  id: string;
  email: string;
  full_name?: string;
  phone?: string;
  user_type: 'personal' | 'business';
  business_name?: string;
}

export async function getCurrentUser(): Promise<AuthUser | null> {
  try {
    const response = await fetch('/api/auth/user', {
      credentials: 'include',
    });

    if (!response.ok) {
      return null;
    }

    const user = await response.json();
    return user;
  } catch {
    return null;
  }
}

export async function signOut() {
  await fetch('/api/auth/signout', { method: 'POST' });
  window.location.href = '/login';
}
