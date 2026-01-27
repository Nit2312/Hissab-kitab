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

    if (userType === 'personal') {
      // Get groups user is a member of
      const groupMembersSnapshot = await db.collection(COLLECTIONS.GROUP_MEMBERS)
        .where('user_id', '==', user.id)
        .get();
      
      const groupIds = groupMembersSnapshot.docs.map(doc => doc.data().group_id);

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

    // Fetch additional details for each expense
    const expensesWithDetails = await Promise.all(
      expenses.map(async (expense) => {
        let groupName = null;
        let participantCount = 1;
        let paidByName = 'Unknown';

        // Get paid by name
        if (expense.paid_by === user.id) {
          paidByName = 'You';
        } else if (expense.group_id) {
          const memberSnapshot = await db.collection(COLLECTIONS.GROUP_MEMBERS)
            .where('group_id', '==', expense.group_id)
            .where('user_id', '==', expense.paid_by)
            .limit(1)
            .get();
          
          if (!memberSnapshot.empty) {
            paidByName = memberSnapshot.docs[0].data().name || 'Unknown';
          }
        } else {
          const paidByUserDoc = await db.collection(COLLECTIONS.USERS).doc(expense.paid_by).get();
          if (paidByUserDoc.exists) {
            paidByName = paidByUserDoc.data()?.full_name || 'Unknown';
          }
        }

        // Get group name and participant count
        if (expense.group_id) {
          const groupDoc = await db.collection(COLLECTIONS.GROUPS).doc(expense.group_id).get();
          if (groupDoc.exists) {
            groupName = groupDoc.data()?.name || null;
          }

          const splitsSnapshot = await db.collection(COLLECTIONS.EXPENSE_SPLITS)
            .where('expense_id', '==', expense.id)
            .get();
          participantCount = splitsSnapshot.size || 1;
        }

        return {
          id: expense.id,
          description: expense.description,
          amount: expense.amount,
          paid_by: expense.paid_by,
          date: expense.date instanceof Date ? expense.date.toISOString().split('T')[0] : expense.date.split('T')[0],
          category: normalizeCategory(expense.category),
          group_id: expense.group_id || null,
          split_type: expense.split_type,
          group_name: groupName,
          participant_count: participantCount,
          paid_by_name: paidByName,
          created_at: expense.created_at instanceof Date ? expense.created_at.toISOString() : expense.created_at,
        };
      })
    );

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
