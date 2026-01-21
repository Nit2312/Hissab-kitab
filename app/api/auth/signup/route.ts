import { NextRequest, NextResponse } from 'next/server';
import { signUp, setAuthCookie } from '@/lib/auth/auth';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, password, full_name, phone, user_type, business_name } = body;

    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email and password are required' },
        { status: 400 }
      );
    }

    if (typeof email !== 'string' || typeof password !== 'string') {
      return NextResponse.json(
        { error: 'Invalid email or password format' },
        { status: 400 }
      );
    }

    if (password.length < 6) {
      return NextResponse.json(
        { error: 'Password must be at least 6 characters long' },
        { status: 400 }
      );
    }

    const result = await signUp(
      email.trim(),
      password,
      full_name?.trim(),
      phone?.trim(),
      user_type || 'personal',
      business_name?.trim()
    );

    if ('error' in result) {
      return NextResponse.json(
        { error: result.error },
        { status: 400 }
      );
    }

    await setAuthCookie(result.sessionToken);

    const response = NextResponse.json({ user: result.user });
    
    // Also set cookie in response headers to ensure it's available immediately
    response.cookies.set('session-token', result.sessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7, // 7 days
      path: '/',
    });

    return response;
  } catch (error: any) {
    console.error('Sign up error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error. Please try again.' },
      { status: 500 }
    );
  }
}
