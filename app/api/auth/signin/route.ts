import { NextRequest, NextResponse } from 'next/server';
import { getAuth } from 'firebase-admin/auth';
import { getFirestoreDB } from '@/lib/firebase/admin';
import { createSession } from '@/lib/auth/auth';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { idToken, userType } = body;

    if (!idToken) {
      return NextResponse.json(
        { error: 'ID token is required' },
        { status: 400 }
      );
    }

    let db;
    try {
      db = getFirestoreDB();
    } catch (configError: any) {
      console.error('Firebase Admin configuration error:', configError);
      return NextResponse.json(
        {
          error:
            configError?.message ||
            'Firebase Admin is not configured. Add FIREBASE_SERVICE_ACCOUNT_KEY or FIREBASE_PROJECT_ID to your environment.',
        },
        { status: 500 }
      );
    }

    const adminAuth = getAuth();

    // Verify the ID token
    let decodedToken;
    try {
      decodedToken = await adminAuth.verifyIdToken(idToken);
    } catch (err) {
      console.error('Token verification error:', err);
      return NextResponse.json(
        {
          error:
            'Invalid or expired token. If this keeps happening, check that your Firebase project ID and Admin credentials match the client app.',
        },
        { status: 401 }
      );
    }

    const uid = decodedToken.uid;

    // Get user data from Firestore
    const userDoc = await db.collection('users').doc(uid).get();
    if (!userDoc.exists) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const userData = userDoc.data();

    // Update user type if provided
    if (userType && userData?.user_type !== userType) {
      await db.collection('users').doc(uid).update({
        user_type: userType,
        updated_at: new Date(),
      });
      userData!.user_type = userType;
    }

    // Create a session using our existing auth system
    const sessionToken = await createSession(uid);

    const response = NextResponse.json({
      user: {
        uid,
        email: decodedToken.email,
        ...userData
      }
    });

    // Set the session cookie
    response.cookies.set('session-token', sessionToken, {
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
