import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth/auth';
import { getFirestoreDB, docToObject } from '@/lib/firebase/admin';
import { COLLECTIONS } from '@/lib/firebase/collections';

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const phone = searchParams.get('phone');
    const email = searchParams.get('email');

    if (!phone && !email) {
      return NextResponse.json({ error: 'phone or email parameter is required' }, { status: 400 });
    }

    const db = getFirestoreDB();
    let foundUser = null;
    
    if (phone) {
      // Search for user by phone (exact match after cleaning)
      const cleanPhone = phone.replace(/[\s\-\(\)\+]/g, '');
      // Firestore doesn't support regex, so we'll search for exact matches
      const phoneSnapshot = await db.collection(COLLECTIONS.USERS)
        .where('phone', '==', cleanPhone)
        .limit(1)
        .get();
      
      if (!phoneSnapshot.empty) {
        foundUser = docToObject(phoneSnapshot.docs[0]);
      }
    } else if (email) {
      // Search for user by email (exact match, case-insensitive)
      const emailLower = email.toLowerCase();
      const emailSnapshot = await db.collection(COLLECTIONS.USERS)
        .where('email', '==', emailLower)
        .limit(1)
        .get();
      
      if (!emailSnapshot.empty) {
        foundUser = docToObject(emailSnapshot.docs[0]);
      }
    }

    if (!foundUser) {
      return NextResponse.json(null);
    }

    // Remove password from response
    const { password, ...userData } = foundUser;

    return NextResponse.json({
      id: userData.id,
      email: userData.email,
      full_name: userData.full_name || null,
      phone: userData.phone || null,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}
