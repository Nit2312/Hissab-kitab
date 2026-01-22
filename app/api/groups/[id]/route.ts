import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth/auth';
import { getDocumentById, isValidFirestoreId, deleteDocument } from '@/lib/firebase/helpers';
import { getFirestoreDB } from '@/lib/firebase/admin';
import { COLLECTIONS } from '@/lib/firebase/collections';

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const params = context.params;
    const resolvedParams = params instanceof Promise ? await params : params;
    
    if (!isValidFirestoreId(resolvedParams.id)) {
      return NextResponse.json({ error: 'Invalid group ID format' }, { status: 400 });
    }

    const group = await getDocumentById(COLLECTIONS.GROUPS, resolvedParams.id);

    if (!group) {
      return NextResponse.json({ error: 'Group not found' }, { status: 404 });
    }

    return NextResponse.json({
      id: group.id,
      name: group.name,
      description: group.description || null,
      type: group.type,
      created_by: group.created_by,
      created_at: group.created_at instanceof Date ? group.created_at.toISOString() : group.created_at,
      updated_at: group.updated_at instanceof Date ? group.updated_at.toISOString() : group.updated_at,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const params = context.params;
    const resolvedParams = params instanceof Promise ? await params : params;
    
    if (!isValidFirestoreId(resolvedParams.id)) {
      return NextResponse.json({ error: 'Invalid group ID format' }, { status: 400 });
    }

    const group = await getDocumentById(COLLECTIONS.GROUPS, resolvedParams.id);

    if (!group) {
      return NextResponse.json({ error: 'Group not found' }, { status: 404 });
    }

    // Check if user is the creator
    if (group.created_by !== user.id) {
      return NextResponse.json({ error: 'Only the group creator can delete the group' }, { status: 403 });
    }

    const db = getFirestoreDB();

    // Delete group members
    const membersSnapshot = await db.collection(COLLECTIONS.GROUP_MEMBERS)
      .where('group_id', '==', resolvedParams.id)
      .get();
    
    const batch = db.batch();
    membersSnapshot.docs.forEach(doc => batch.delete(doc.ref));
    
    // Delete group
    batch.delete(db.collection(COLLECTIONS.GROUPS).doc(resolvedParams.id));
    
    await batch.commit();

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}
