import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth/auth';
import { getDocumentById, isValidFirestoreId } from '@/lib/firebase/helpers';
import { COLLECTIONS } from '@/lib/firebase/collections';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    if (!isValidFirestoreId(params.id)) {
      return NextResponse.json({ error: 'Invalid user ID format' }, { status: 400 });
    }

    const userDoc = await getDocumentById(COLLECTIONS.USERS, params.id);

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
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}
