import { NextRequest, NextResponse } from 'next/server';



import { getFirestoreDB } from '@/lib/firebase/admin';
import { getAuth } from 'firebase-admin/auth';


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

    // Use shared Firebase Admin instance
    const db = getFirestoreDB();
    const adminAuth = getAuth();

    // Validate and format phone number for Firebase (E.164 format required)
    let formattedPhone: string | undefined = undefined;
    if (phone && phone.trim()) {
      const phoneStr = phone.trim();
      // Check if phone starts with + and contains only digits after that
      if (/^\+\d{10,15}$/.test(phoneStr)) {
        formattedPhone = phoneStr;
      } else {
        // Try to format it if it doesn't have +
        console.log('Phone number not in E.164 format, will be stored in Firestore only');
      }
    }

    // Create user with Firebase Admin Auth
    const userRecord = await adminAuth.createUser({
      email,
      password,
      displayName: full_name || undefined,
      phoneNumber: formattedPhone, // Only include if properly formatted
      disabled: false,
    });

    await db.collection('users').doc(userRecord.uid).set({
      email: userRecord.email,
      full_name: full_name || null,
      phone: phone || null,
      user_type: user_type || 'personal',
      business_name: user_type === 'business' ? (business_name || null) : null,
      created_at: new Date(),
      updated_at: new Date(),
    });

    return NextResponse.json({ user: { uid: userRecord.uid, email: userRecord.email } });
  } catch (error: any) {
    console.error('Sign up error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error. Please try again.' },
      { status: 500 }
    );
  }
}
