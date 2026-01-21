import bcrypt from 'bcryptjs';
import { cookies } from 'next/headers';
import { randomBytes } from 'crypto';
import mongoose from 'mongoose';
import User from '@/lib/mongodb/models/User';
import Session from '@/lib/mongodb/models/Session';
import connectDB from '@/lib/mongodb/connect';

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
  await connectDB();
  
  const sessionToken = generateSessionToken();
  const expiresAt = new Date(Date.now() + SESSION_DURATION);
  
  await Session.create({
    user_id: new mongoose.Types.ObjectId(userId),
    session_token: sessionToken,
    expires_at: expiresAt,
  });
  
  return sessionToken;
}

export async function getSessionUser(sessionToken: string): Promise<AuthUser | null> {
  try {
    await connectDB();
    
    const session = await Session.findOne({
      session_token: sessionToken,
      expires_at: { $gt: new Date() },
    }).populate('user_id');
    
    if (!session || !session.user_id) {
      return null;
    }
    
    const user = session.user_id as any;
    
    return {
      id: user._id.toString(),
      email: user.email,
      full_name: user.full_name,
      phone: user.phone,
      user_type: user.user_type,
      business_name: user.business_name,
    };
  } catch {
    return null;
  }
}

export async function deleteSession(sessionToken: string): Promise<void> {
  try {
    await connectDB();
    await Session.deleteOne({ session_token: sessionToken });
  } catch {
    // Ignore errors
  }
}

export async function getCurrentUser(): Promise<AuthUser | null> {
  try {
    const cookieStore = await cookies();
    const sessionToken = cookieStore.get('session-token')?.value;

    if (!sessionToken) {
      return null;
    }

    return await getSessionUser(sessionToken);
  } catch {
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
    await connectDB();

    // Check if email already exists
    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      return { error: 'User with this email already exists' };
    }

    // Check if phone number already exists for this user type
    if (phone?.trim()) {
      const existingProfile = await User.findOne({
        phone: phone.trim(),
        user_type,
      });

      if (existingProfile) {
        return {
          error: `This phone number is already registered with a ${user_type} account. You can use the same phone number for both personal and business accounts, but not for two accounts of the same type.`,
        };
      }
    }

    // Hash password
    const hashedPassword = await hashPassword(password);

    // Create user
    const user = await User.create({
      email: email.toLowerCase(),
      password: hashedPassword,
      full_name,
      phone: phone?.trim() || undefined,
      user_type,
      business_name: user_type === 'business' ? business_name : undefined,
    });

    // Create session
    const sessionToken = await createSession(user._id.toString());

    return {
      user: {
        id: user._id.toString(),
        email: user.email,
        full_name: user.full_name,
        phone: user.phone,
        user_type: user.user_type,
        business_name: user.business_name,
      },
      sessionToken,
    };
  } catch (error: any) {
    if (error.code === 11000) {
      // Duplicate key error
      if (error.keyPattern?.phone) {
        return {
          error: `This phone number is already registered with a ${user_type} account.`,
        };
      }
      return { error: 'User with this email already exists' };
    }
    return { error: error.message || 'Failed to create account' };
  }
}

export async function signIn(
  email: string,
  password: string
): Promise<{ user: AuthUser; sessionToken: string } | { error: string }> {
  try {
    await connectDB();

    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      return { error: 'Invalid email or password' };
    }

    const isPasswordValid = await comparePassword(password, user.password);
    if (!isPasswordValid) {
      return { error: 'Invalid email or password' };
    }

    // Create session
    const sessionToken = await createSession(user._id.toString());

    return {
      user: {
        id: user._id.toString(),
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
