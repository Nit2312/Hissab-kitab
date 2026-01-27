import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth/auth';
import { getDocumentById, isValidFirestoreId, deleteDocument, updateDocument } from '@/lib/firebase/helpers';
import { getFirestoreDB } from '@/lib/firebase/admin';
import { COLLECTIONS } from '@/lib/firebase/collections';
import { Timestamp } from 'firebase-admin/firestore';

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

export async function PUT(
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
      return NextResponse.json({ error: 'Only the group creator can update the group' }, { status: 403 });
    }

    const body = await request.json();
    const { name, description, type } = body;

    // Prepare update data
    const updateData: any = {};
    if (name !== undefined) updateData.name = name;
    if (description !== undefined) updateData.description = description;
    if (type !== undefined) updateData.type = type;
    updateData.updated_at = Timestamp.now();

    const updatedGroup = await updateDocument(COLLECTIONS.GROUPS, resolvedParams.id, updateData);

    return NextResponse.json({
      id: updatedGroup.id,
      name: updatedGroup.name,
      description: updatedGroup.description || null,
      type: updatedGroup.type,
      created_by: updatedGroup.created_by,
      created_at: updatedGroup.created_at instanceof Date ? updatedGroup.created_at.toISOString() : updatedGroup.created_at,
      updated_at: updatedGroup.updated_at instanceof Date ? updatedGroup.updated_at.toISOString() : updatedGroup.updated_at,
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
    const batch = db.batch();

    try {
      // Delete group members
      const membersSnapshot = await db.collection(COLLECTIONS.GROUP_MEMBERS)
        .where('group_id', '==', resolvedParams.id)
        .get();
      
      console.log(`Deleting ${membersSnapshot.docs.length} group members`);
      membersSnapshot.docs.forEach(doc => batch.delete(doc.ref));

      // Get all expenses for this group
      const expensesSnapshot = await db.collection(COLLECTIONS.EXPENSES)
        .where('group_id', '==', resolvedParams.id)
        .get();

      console.log(`Deleting ${expensesSnapshot.docs.length} expenses`);
      
      // Delete expense splits for each expense
      for (const expenseDoc of expensesSnapshot.docs) {
        const expenseId = expenseDoc.id;
        
        // Get splits for this expense
        const splitsSnapshot = await db.collection(COLLECTIONS.EXPENSE_SPLITS)
          .where('expense_id', '==', expenseId)
          .get();
        
        console.log(`Deleting ${splitsSnapshot.docs.length} splits for expense ${expenseId}`);
        splitsSnapshot.docs.forEach(doc => batch.delete(doc.ref));
        
        // Delete the expense itself
        batch.delete(expenseDoc.ref);
      }

      // Delete settlements related to this group
      const settlementsSnapshot = await db.collection(COLLECTIONS.SETTLEMENTS)
        .where('group_id', '==', resolvedParams.id)
        .get();
      
      console.log(`Deleting ${settlementsSnapshot.docs.length} settlements`);
      settlementsSnapshot.docs.forEach(doc => batch.delete(doc.ref));

      // Delete reminders related to this group
      const remindersSnapshot = await db.collection(COLLECTIONS.REMINDERS)
        .where('group_id', '==', resolvedParams.id)
        .get();
      
      console.log(`Deleting ${remindersSnapshot.docs.length} reminders`);
      remindersSnapshot.docs.forEach(doc => batch.delete(doc.ref));

      // Finally delete the group
      batch.delete(db.collection(COLLECTIONS.GROUPS).doc(resolvedParams.id));
      
      await batch.commit();
      
      console.log(`Successfully deleted group ${resolvedParams.id} and all related data`);
      return NextResponse.json({ success: true, message: 'Group and all related data deleted successfully' });
      
    } catch (batchError: any) {
      console.error('Error during batch delete:', batchError);
      return NextResponse.json({ error: 'Failed to delete group data', details: batchError?.message || 'Unknown error' }, { status: 500 });
    }
    
  } catch (error: any) {
    console.error('Error deleting group:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}
