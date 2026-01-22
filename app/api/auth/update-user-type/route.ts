import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth/auth';
import { updateDocument } from '@/lib/firebase/helpers';
import { COLLECTIONS } from '@/lib/firebase/collections';

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    
    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const { user_type } = await request.json();

    if (!user_type || !['personal', 'business'].includes(user_type)) {
      return NextResponse.json({ error: 'Invalid user type' }, { status: 400 });
    }

    await updateDocument(COLLECTIONS.USERS, user.id, { user_type });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}
