import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth/auth';
import { getDocumentById, updateDocument } from '@/lib/firebase/helpers';
import { getFirestoreDB } from '@/lib/firebase/admin';
import { COLLECTIONS } from '@/lib/firebase/collections';

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const userDoc = await getDocumentById(COLLECTIONS.USERS, user.id);

    if (!userDoc) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Remove password from response
    const { password, ...userData } = userDoc;

    return NextResponse.json({
      id: userData.id,
      email: userData.email,
      full_name: userData.full_name || null,
      phone: userData.phone || null,
      user_type: userData.user_type,
      business_name: userData.business_name || null,
      created_at: userData.created_at instanceof Date ? userData.created_at.toISOString() : userData.created_at,
      updated_at: userData.updated_at instanceof Date ? userData.updated_at.toISOString() : userData.updated_at,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const body = await request.json();
    const { full_name, phone, business_name } = body;

    const db = getFirestoreDB();

    // Check if phone number already exists for this user type (if phone is being changed)
    if (phone && phone.trim() && phone.trim() !== user.phone) {
      const existingUserSnapshot = await db.collection(COLLECTIONS.USERS)
        .where('phone', '==', phone.trim())
        .where('user_type', '==', user.user_type)
        .where('__name__', '!=', user.id)
        .limit(1)
        .get();

      if (!existingUserSnapshot.empty) {
        return NextResponse.json({
          error: `This phone number is already registered with a ${user.user_type} account.`,
        }, { status: 400 });
      }
    }

    const updateData: any = {};
    if (full_name !== undefined) updateData.full_name = full_name || null;
    if (phone !== undefined) updateData.phone = phone?.trim() || null;
    if (business_name !== undefined) updateData.business_name = business_name || null;

    const updatedUser = await updateDocument(COLLECTIONS.USERS, user.id, updateData);

    // Remove password from response
    const { password, ...userData } = updatedUser;

    return NextResponse.json({
      id: userData.id,
      email: userData.email,
      full_name: userData.full_name || null,
      phone: userData.phone || null,
      user_type: userData.user_type,
      business_name: userData.business_name || null,
      created_at: userData.created_at instanceof Date ? userData.created_at.toISOString() : userData.created_at,
      updated_at: userData.updated_at instanceof Date ? userData.updated_at.toISOString() : userData.updated_at,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}
