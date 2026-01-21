import { NextRequest, NextResponse } from 'next/server';
import { signIn, setAuthCookie } from '@/lib/auth/auth';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, password } = body;

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

    const result = await signIn(email.trim(), password);

    if ('error' in result) {
      return NextResponse.json(
        { error: result.error },
        { status: 401 }
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
    console.error('Sign in error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error. Please try again.' },
      { status: 500 }
    );
  }
}
