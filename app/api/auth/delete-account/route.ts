import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth/auth';
import { getFirestoreDB } from '@/lib/firebase/admin';
import { COLLECTIONS } from '@/lib/firebase/collections';

export async function DELETE() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const db = getFirestoreDB();
    const userId = user.id;

    // Delete all user data in order to respect dependencies
    
    // Delete sessions
    const sessionsSnapshot = await db.collection(COLLECTIONS.SESSIONS)
      .where('user_id', '==', userId)
      .get();
    
    const batch1 = db.batch();
    sessionsSnapshot.docs.forEach(doc => batch1.delete(doc.ref));
    await batch1.commit();
    
    // Delete reminders
    const fromRemindersSnapshot = await db.collection(COLLECTIONS.REMINDERS)
      .where('from_user_id', '==', userId)
      .get();
    
    const toRemindersSnapshot = await db.collection(COLLECTIONS.REMINDERS)
      .where('to_user_id', '==', userId)
      .get();
    
    const batch2 = db.batch();
    [...fromRemindersSnapshot.docs, ...toRemindersSnapshot.docs].forEach(doc => batch2.delete(doc.ref));
    await batch2.commit();
    
    // Delete settlements
    const fromSettlementsSnapshot = await db.collection(COLLECTIONS.SETTLEMENTS)
      .where('from_user_id', '==', userId)
      .get();
    
    const toSettlementsSnapshot = await db.collection(COLLECTIONS.SETTLEMENTS)
      .where('to_user_id', '==', userId)
      .get();
    
    const batch3 = db.batch();
    [...fromSettlementsSnapshot.docs, ...toSettlementsSnapshot.docs].forEach(doc => batch3.delete(doc.ref));
    await batch3.commit();
    
    // Delete expense splits (via expenses)
    const userExpensesSnapshot = await db.collection(COLLECTIONS.EXPENSES)
      .where('paid_by', '==', userId)
      .get();
    
    const expenseIds = userExpensesSnapshot.docs.map(doc => doc.id);
    
    // Delete expense splits for user's expenses
    if (expenseIds.length > 0) {
      for (let i = 0; i < expenseIds.length; i += 10) {
        const batch = expenseIds.slice(i, i + 10);
        const splitsPromises = batch.map(expenseId =>
          db.collection(COLLECTIONS.EXPENSE_SPLITS)
            .where('expense_id', '==', expenseId)
            .get()
        );
        const splitsSnapshots = await Promise.all(splitsPromises);
        const batch4 = db.batch();
        splitsSnapshots.forEach(snapshot => {
          snapshot.docs.forEach(doc => batch4.delete(doc.ref));
        });
        await batch4.commit();
      }
    }
    
    // Delete expenses
    const batch5 = db.batch();
    userExpensesSnapshot.docs.forEach(doc => batch5.delete(doc.ref));
    await batch5.commit();
    
    // Delete group members
    const userGroupMembersSnapshot = await db.collection(COLLECTIONS.GROUP_MEMBERS)
      .where('user_id', '==', userId)
      .get();
    
    const groupIds = userGroupMembersSnapshot.docs.map(doc => doc.data().group_id);
    
    // Delete expense splits for groups user was in
    if (groupIds.length > 0) {
      for (let i = 0; i < groupIds.length; i += 10) {
        const batch = groupIds.slice(i, i + 10);
        const groupExpensesPromises = batch.map(groupId =>
          db.collection(COLLECTIONS.EXPENSES)
            .where('group_id', '==', groupId)
            .get()
        );
        const groupExpensesSnapshots = await Promise.all(groupExpensesPromises);
        
        const groupExpenseIds: string[] = [];
        groupExpensesSnapshots.forEach(snapshot => {
          snapshot.docs.forEach(doc => groupExpenseIds.push(doc.id));
        });
        
        if (groupExpenseIds.length > 0) {
          for (let j = 0; j < groupExpenseIds.length; j += 10) {
            const expenseBatch = groupExpenseIds.slice(j, j + 10);
            const splitsPromises = expenseBatch.map(expenseId =>
              db.collection(COLLECTIONS.EXPENSE_SPLITS)
                .where('expense_id', '==', expenseId)
                .get()
            );
            const splitsSnapshots = await Promise.all(splitsPromises);
            const batch6 = db.batch();
            splitsSnapshots.forEach(snapshot => {
              snapshot.docs.forEach(doc => batch6.delete(doc.ref));
            });
            await batch6.commit();
          }
        }
      }
    }
    
    // Delete group expenses
    if (groupIds.length > 0) {
      for (let i = 0; i < groupIds.length; i += 10) {
        const batch = groupIds.slice(i, i + 10);
        const groupExpensesPromises = batch.map(groupId =>
          db.collection(COLLECTIONS.EXPENSES)
            .where('group_id', '==', groupId)
            .get()
        );
        const groupExpensesSnapshots = await Promise.all(groupExpensesPromises);
        const batch7 = db.batch();
        groupExpensesSnapshots.forEach(snapshot => {
          snapshot.docs.forEach(doc => batch7.delete(doc.ref));
        });
        await batch7.commit();
      }
    }
    
    // Delete group members
    const batch8 = db.batch();
    userGroupMembersSnapshot.docs.forEach(doc => batch8.delete(doc.ref));
    await batch8.commit();
    
    // Delete groups created by user
    const groupsSnapshot = await db.collection(COLLECTIONS.GROUPS)
      .where('created_by', '==', userId)
      .get();
    
    const batch9 = db.batch();
    groupsSnapshot.docs.forEach(doc => batch9.delete(doc.ref));
    await batch9.commit();
    
    // Delete khata transactions
    const transactionsSnapshot = await db.collection(COLLECTIONS.KHATA_TRANSACTIONS)
      .where('owner_id', '==', userId)
      .get();
    
    const batch10 = db.batch();
    transactionsSnapshot.docs.forEach(doc => batch10.delete(doc.ref));
    await batch10.commit();
    
    // Delete customers
    const customersSnapshot = await db.collection(COLLECTIONS.CUSTOMERS)
      .where('owner_id', '==', userId)
      .get();
    
    const batch11 = db.batch();
    customersSnapshot.docs.forEach(doc => batch11.delete(doc.ref));
    await batch11.commit();
    
    // Finally, delete user
    await db.collection(COLLECTIONS.USERS).doc(userId).delete();

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error deleting account:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
