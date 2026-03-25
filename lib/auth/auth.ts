import bcrypt from 'bcryptjs';
import { cookies } from 'next/headers';
import { randomBytes } from 'crypto';
import { getFirestoreDB, prepareDataForFirestore, docToObject } from '@/lib/firebase/admin';
import { COLLECTIONS } from '@/lib/firebase/collections';
import { Timestamp } from 'firebase-admin/firestore';

export interface AuthUser {
  id: string;
  email: string;
  full_name?: string;
  phone?: string;
  user_type: 'personal' | 'business';
  business_name?: string;
}

const SESSION_DURATION = 7 * 24 * 60 * 60 * 1000; // 7 days in milliseconds

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10);
}

export async function comparePassword(password: string, hashedPassword: string): Promise<boolean> {
  return bcrypt.compare(password, hashedPassword);
}

export function generateSessionToken(): string {
  return randomBytes(32).toString('hex');
}

export async function createSession(userId: string): Promise<string> {
  const db = getFirestoreDB();

  const sessionToken = generateSessionToken();
  const expiresAt = new Date(Date.now() + SESSION_DURATION);

  await db.collection(COLLECTIONS.SESSIONS).add({
    user_id: userId,
    session_token: sessionToken,
    expires_at: Timestamp.fromDate(expiresAt),
    created_at: Timestamp.now(),
  });

  return sessionToken;
}

export async function getSessionUser(sessionToken: string): Promise<AuthUser | null> {
  try {
    const db = getFirestoreDB();

    // Find session by token (search by token only to avoid index requirement)
    const sessionsSnapshot = await db.collection(COLLECTIONS.SESSIONS)
      .where('session_token', '==', sessionToken)
      .limit(1)
      .get();

    if (sessionsSnapshot.empty) {
      console.log('[Auth Debug] Session not found for token:', sessionToken.substring(0, 10));
      return null;
    }

    const sessionDoc = sessionsSnapshot.docs[0];
    const sessionData = sessionDoc.data();

    // Check expiration in memory
    const expiresAt = sessionData.expires_at instanceof Timestamp
      ? sessionData.expires_at.toDate()
      : new Date(sessionData.expires_at);

    if (expiresAt < new Date()) {
      console.log('[Auth Debug] Session expired');
      // Optionally delete expired session here
      return null;
    }

    const userId = sessionData.user_id;

    if (!userId) {
      console.log('[Auth Debug] Session found but no user_id');
      return null;
    }

    // Get user document
    const userDoc = await db.collection(COLLECTIONS.USERS).doc(userId).get();

    if (!userDoc.exists) {
      console.log('[Auth Debug] User document not found for ID:', userId);
      return null;
    }

    const user = docToObject(userDoc);

    return {
      id: user.id,
      email: user.email,
      full_name: user.full_name,
      phone: user.phone,
      user_type: user.user_type,
      business_name: user.business_name,
    };
  } catch (error) {
    console.error('[Auth Debug] getSessionUser error:', error);
    return null;
  }
}

export async function deleteSession(sessionToken: string): Promise<void> {
  try {
    const db = getFirestoreDB();
    const sessionsSnapshot = await db.collection(COLLECTIONS.SESSIONS)
      .where('session_token', '==', sessionToken)
      .limit(1)
      .get();

    if (!sessionsSnapshot.empty) {
      await sessionsSnapshot.docs[0].ref.delete();
    }
  } catch {
    // Ignore errors
  }
}

export async function getCurrentUser(): Promise<AuthUser | null> {
  try {
    const cookieStore = await cookies();
    const sessionToken = cookieStore.get('session-token')?.value;

    console.log('[Auth Debug] getCurrentUser called. Token present:', !!sessionToken);

    if (!sessionToken) {
      console.log('[Auth Debug] No session token found in cookies');
      return null;
    }

    const user = await getSessionUser(sessionToken);
    console.log('[Auth Debug] getSessionUser result:', user ? `Found user ${user.email}` : 'User not found');
    return user;
  } catch (error) {
    console.error('[Auth Debug] getCurrentUser error:', error);
    return null;
  }
}

export async function signUp(
  email: string,
  password: string,
  full_name?: string,
  phone?: string,
  user_type: 'personal' | 'business' = 'personal',
  business_name?: string
): Promise<{ user: AuthUser; sessionToken: string } | { error: string }> {
  try {
    const db = getFirestoreDB();

    // Check if email already exists
    const emailSnapshot = await db.collection(COLLECTIONS.USERS)
      .where('email', '==', email.toLowerCase())
      .limit(1)
      .get();

    if (!emailSnapshot.empty) {
      return { error: 'User with this email already exists' };
    }

    // Check if phone number already exists for this user type
    if (phone?.trim()) {
      const phoneSnapshot = await db.collection(COLLECTIONS.USERS)
        .where('phone', '==', phone.trim())
        .where('user_type', '==', user_type)
        .limit(1)
        .get();

      if (!phoneSnapshot.empty) {
        return {
          error: `This phone number is already registered with a ${user_type} account. You can use the same phone number for both personal and business accounts, but not for two accounts of the same type.`,
        };
      }
    }

    // Hash password
    const hashedPassword = await hashPassword(password);

    // Create user
    const now = Timestamp.now();
    const userData = {
      email: email.toLowerCase(),
      password: hashedPassword,
      full_name: full_name || null,
      phone: phone?.trim() || null,
      user_type,
      business_name: user_type === 'business' ? (business_name || null) : null,
      created_at: now,
      updated_at: now,
    };

    const userRef = await db.collection(COLLECTIONS.USERS).add(userData);
    const userDoc = await userRef.get();
    const user = docToObject(userDoc);

    // Create session
    const sessionToken = await createSession(user.id);

    return {
      user: {
        id: user.id,
        email: user.email,
        full_name: user.full_name,
        phone: user.phone,
        user_type: user.user_type,
        business_name: user.business_name,
      },
      sessionToken,
    };
  } catch (error: any) {
    console.error('Sign up error:', error);
    console.error('Error code:', error.code);
    console.error('Error message:', error.message);
    console.error('Error details:', error.details);

    // Provide more helpful error messages
    if (error.code === 5 || error.message?.includes('NOT_FOUND')) {
      return {
        error: 'Firestore database connection failed. Please verify: 1) Database exists in Firebase Console, 2) Service account has proper permissions, 3) Project ID matches (hissab-kitab-69a41)'
      };
    }

    if (error.code === 7 || error.message?.includes('PERMISSION_DENIED')) {
      return {
        error: 'Permission denied. Please check your Firebase service account has "Cloud Datastore User" or "Firebase Admin" role.'
      };
    }

    if (error.code === 16 || error.message?.includes('UNAUTHENTICATED')) {
      return {
        error: 'Authentication failed. Please check your FIREBASE_SERVICE_ACCOUNT_KEY or FIREBASE_PROJECT_ID in .env.local.'
      };
    }

    return { error: error.message || 'Failed to create account' };
  }
}

export async function signIn(
  email: string,
  password: string
): Promise<{ user: AuthUser; sessionToken: string } | { error: string }> {
  try {
    const db = getFirestoreDB();

    const usersSnapshot = await db.collection(COLLECTIONS.USERS)
      .where('email', '==', email.toLowerCase())
      .limit(1)
      .get();

    if (usersSnapshot.empty) {
      return { error: 'Invalid email or password' };
    }

    const userDoc = usersSnapshot.docs[0];
    const user = docToObject(userDoc);

    const isPasswordValid = await comparePassword(password, user.password);
    if (!isPasswordValid) {
      return { error: 'Invalid email or password' };
    }

    // Create session
    const sessionToken = await createSession(user.id);

    return {
      user: {
        id: user.id,
        email: user.email,
        full_name: user.full_name,
        phone: user.phone,
        user_type: user.user_type,
        business_name: user.business_name,
      },
      sessionToken,
    };
  } catch (error: any) {
    return { error: error.message || 'Failed to sign in' };
  }
}

export async function setAuthCookie(sessionToken: string) {
  const cookieStore = await cookies();
  cookieStore.set('session-token', sessionToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 7, // 7 days
    path: '/',
  });
}

export async function removeAuthCookie() {
  const cookieStore = await cookies();
  const sessionToken = cookieStore.get('session-token')?.value;

  if (sessionToken) {
    await deleteSession(sessionToken);
  }

  cookieStore.delete('session-token');
}
