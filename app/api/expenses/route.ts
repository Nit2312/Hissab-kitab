import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth/auth'
import { getFirestoreDB, docToObject, prepareDataForFirestore } from '@/lib/firebase/admin'
import { updateDocument, deleteDocument, isValidFirestoreId, createDocument } from '@/lib/firebase/helpers'
import { COLLECTIONS } from '@/lib/firebase/collections'
import { Timestamp } from 'firebase-admin/firestore'

// Simple cache for expenses (5 minutes TTL)
const expensesCache = new Map<string, { data: any; timestamp: number; ttl: number }>();
const CACHE_TTL = 5 * 60 * 1000 // 5 minutes

function getFromCache(key: string): any | null {
  const cached = expensesCache.get(key);
  if (!cached) return null;
  
  const now = Date.now();
  if (now - cached.timestamp > cached.ttl) {
    expensesCache.delete(key);
    return null;
  }
  
  return cached.data;
}

function setCache(key: string, data: any): void {
  expensesCache.set(key, {
    data,
    timestamp: Date.now(),
    ttl: CACHE_TTL
  });
};

function normalizeCategory(category: unknown) {
  if (typeof category !== 'string') return 'Others';
  if (category.toLowerCase() === 'other') return 'Others';
  return category;
}

async function fetchDocsByIds<T = any>(db: any, collection: string, ids: string[]) {
  const results: T[] = [];
  for (let i = 0; i < ids.length; i += 10) {
    const batch = ids.slice(i, i + 10);
    if (batch.length === 0) continue;
    const snapshot = await db.collection(collection)
      .where('__name__', 'in', batch)
      .get();
    results.push(...snapshot.docs.map((doc: any) => docToObject(doc)));
  }
  return results;
}

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    // Check cache first
    const cacheKey = `expenses_${user.id}`;
    const cachedData = getFromCache(cacheKey);
    if (cachedData) {
      return NextResponse.json(cachedData);
    }

    const db = getFirestoreDB();

    // Get user type
    const userDoc = await db.collection(COLLECTIONS.USERS).doc(user.id).get();
    const userData = userDoc.data();
    const userType = userData?.user_type || 'personal';

    let expenses: any[] = [];
    let groupIdsForMemberLookup: string[] = [];

    if (userType === 'personal') {
      // Get groups user is a member of
      const groupMembersSnapshot = await db.collection(COLLECTIONS.GROUP_MEMBERS)
        .where('user_id', '==', user.id)
        .get();
      
      const groupIds = groupMembersSnapshot.docs.map(doc => doc.data().group_id);
      groupIdsForMemberLookup = groupIds;

      // Get expenses paid by user
      const paidBySnapshot = await db.collection(COLLECTIONS.EXPENSES)
        .where('paid_by', '==', user.id)
        .get();

      expenses = paidBySnapshot.docs.map(doc => docToObject(doc));

      // Get expenses from groups user is a member of
      if (groupIds.length > 0) {
        for (let i = 0; i < groupIds.length; i += 10) {
          const batch = groupIds.slice(i, i + 10);
          const groupExpensesSnapshot = await db.collection(COLLECTIONS.EXPENSES)
            .where('group_id', 'in', batch)
            .get();
          
          const groupExpenses = groupExpensesSnapshot.docs.map(doc => docToObject(doc));
          // Merge and deduplicate
          const existingIds = new Set(expenses.map(e => e.id));
          groupExpenses.forEach(e => {
            if (!existingIds.has(e.id)) {
              expenses.push(e);
            }
          });
        }
      }
    } else {
      // Business users: only show expenses they paid (no group expenses)
      const expensesSnapshot = await db.collection(COLLECTIONS.EXPENSES)
        .where('paid_by', '==', user.id)
        .where('group_id', '==', null)
        .get();
      
      expenses = expensesSnapshot.docs.map(doc => docToObject(doc));
    }

    // Sort expenses
    expenses.sort((a, b) => {
      const dateA = a.date instanceof Date ? a.date : new Date(a.date);
      const dateB = b.date instanceof Date ? b.date : new Date(b.date);
      if (dateB.getTime() !== dateA.getTime()) {
        return dateB.getTime() - dateA.getTime();
      }
      const createdA = a.created_at instanceof Date ? a.created_at : new Date(a.created_at);
      const createdB = b.created_at instanceof Date ? b.created_at : new Date(b.created_at);
      return createdB.getTime() - createdA.getTime();
    });

    const uniqueGroupIds = Array.from(new Set(expenses.map((expense) => expense.group_id).filter(Boolean)));
    const uniquePayerIds = Array.from(
      new Set(expenses.map((expense) => expense.paid_by).filter((id) => id && id !== user.id))
    );
    const uniqueExpenseIds = expenses.filter((expense) => expense.group_id).map((expense) => expense.id);

    const [groupDocs, payerDocs, splitDocs, memberDocs] = await Promise.all([
      fetchDocsByIds(db, COLLECTIONS.GROUPS, uniqueGroupIds),
      fetchDocsByIds(db, COLLECTIONS.USERS, uniquePayerIds),
      Promise.all(
        uniqueExpenseIds.length === 0
          ? []
          : uniqueExpenseIds.reduce((acc: Promise<any>[], _, index) => {
              if (index % 10 === 0) {
                const batch = uniqueExpenseIds.slice(index, index + 10);
                acc.push(
                  db.collection(COLLECTIONS.EXPENSE_SPLITS)
                    .where('expense_id', 'in', batch)
                    .get()
                    .then((snapshot: any) => snapshot.docs.map((doc: any) => docToObject(doc)))
                );
              }
              return acc;
            }, [])
      ).then((batches) => batches.flat()),
      groupIdsForMemberLookup.length === 0
        ? []
        : Promise.all(
            groupIdsForMemberLookup.reduce((acc: Promise<any>[], _, index) => {
              if (index % 10 === 0) {
                const batch = groupIdsForMemberLookup.slice(index, index + 10);
                acc.push(
                  db.collection(COLLECTIONS.GROUP_MEMBERS)
                    .where('group_id', 'in', batch)
                    .get()
                    .then((snapshot: any) => snapshot.docs.map((doc: any) => docToObject(doc)))
                );
              }
              return acc;
            }, [])
          ).then((batches) => batches.flat()),
    ]);

    const groupNameMap = new Map(groupDocs.map((group: any) => [group.id, group.name || null]));
    const payerNameMap = new Map(payerDocs.map((payer: any) => [payer.id, payer.full_name || payer.name || 'Unknown']));
    const memberNameMap = new Map<string, string>();
    memberDocs.forEach((member: any) => {
      memberNameMap.set(`${member.group_id}:${member.user_id}`, member.name || 'Unknown');
    });
    const splitCountMap = new Map<string, number>();
    splitDocs.forEach((split: any) => {
      splitCountMap.set(split.expense_id, (splitCountMap.get(split.expense_id) || 0) + 1);
    });

    const expensesWithDetails = expenses.map((expense) => {
      const paidByName =
        expense.paid_by === user.id
          ? 'You'
          : memberNameMap.get(`${expense.group_id}:${expense.paid_by}`) ||
            payerNameMap.get(expense.paid_by) ||
            'Unknown';

      return {
        id: expense.id,
        description: expense.description,
        amount: expense.amount,
        paid_by: expense.paid_by,
        date: expense.date instanceof Date ? expense.date.toISOString().split('T')[0] : expense.date.split('T')[0],
        category: normalizeCategory(expense.category),
        group_id: expense.group_id || null,
        split_type: expense.split_type,
        group_name: expense.group_id ? groupNameMap.get(expense.group_id) || null : null,
        participant_count: expense.group_id ? splitCountMap.get(expense.id) || 1 : 1,
        paid_by_name: paidByName,
        created_at: expense.created_at instanceof Date ? expense.created_at.toISOString() : expense.created_at,
      };
    });

    // Cache the result
    setCache(cacheKey, expensesWithDetails);
    return NextResponse.json(expensesWithDetails);
  } catch (error: any) {
    console.error('Error fetching expenses:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const body = await request.json();
    const { description, amount, category, group_id, split_type, date, members } = body;

    if (!description || !amount) {
      return NextResponse.json({ error: 'Description and amount are required' }, { status: 400 });
    }

    const db = getFirestoreDB();

    // Create expense
    const expenseDate = date ? new Date(date) : new Date();
    const expense = await createDocument(COLLECTIONS.EXPENSES, {
      description,
      amount: Number(amount),
      category: normalizeCategory(category),
      group_id: group_id || null,
      split_type: split_type || 'equal',
      paid_by: user.id,
      date: expenseDate,
    });

    // Create expense splits if group is provided
    if (expense.group_id) {
      // Get all group members for this group
      const groupMembersSnapshot = await db.collection(COLLECTIONS.GROUP_MEMBERS)
        .where('group_id', '==', expense.group_id)
        .get();

      if (!groupMembersSnapshot.empty) {
        const splitAmount = Number(amount) / groupMembersSnapshot.size;
        const batch = db.batch();

        // If the payer is a group member, mark their own share as paid.
        // This prevents the payer from "owing themselves" in settlement calculations.
        const payerMemberDoc = groupMembersSnapshot.docs.find((d) => d.data()?.user_id === user.id);

        groupMembersSnapshot.docs.forEach((memberDoc) => {
          const splitRef = db.collection(COLLECTIONS.EXPENSE_SPLITS).doc();
          const isPayer = payerMemberDoc ? memberDoc.id === payerMemberDoc.id : false;

          batch.set(splitRef, {
            expense_id: expense.id,
            member_id: memberDoc.id,
            amount: splitAmount,
            is_paid: isPayer,
            created_at: Timestamp.now(),
          });
        });
        
        await batch.commit();
      }
    }

    // Clear cache for this user
    expensesCache.delete(`expenses_${user.id}`);

    // Broadcast WebSocket event for real-time updates (optional)
    try {
      const { broadcastExpenseUpdate } = await import('@/lib/websocket/server');
      broadcastExpenseUpdate('added', {
        id: expense.id,
        description: expense.description,
        amount: expense.amount,
        paid_by: expense.paid_by,
        date: expense.date instanceof Date ? expense.date.toISOString().split('T')[0] : expense.date.split('T')[0],
        category: normalizeCategory(expense.category),
        group_id: expense.group_id || null,
        split_type: expense.split_type,
      }, user.id);
    } catch (wsError: any) {
      // WebSocket server might not be running - that's okay
      console.log('WebSocket broadcast skipped (server not available):', wsError?.message || wsError);
    }

    return NextResponse.json({
      id: expense.id,
      description: expense.description,
      amount: expense.amount,
      paid_by: expense.paid_by,
      date: expense.date instanceof Date ? expense.date.toISOString().split('T')[0] : expense.date.split('T')[0],
      category: normalizeCategory(expense.category),
      group_id: expense.group_id || null,
      split_type: expense.split_type,
    });
  } catch (error: any) {
    console.error('Error creating expense:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}
