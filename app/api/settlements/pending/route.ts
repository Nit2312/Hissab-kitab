import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth/auth';
import { getFirestoreDB, docToObject } from '@/lib/firebase/admin';
import { COLLECTIONS } from '@/lib/firebase/collections';

function round2(n: number) {
  return Math.round((n + Number.EPSILON) * 100) / 100
}

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    console.log('🔍 Pending API - User:', user.id, user.email);

    const db = getFirestoreDB();

    // Get all groups where user is a member
    const groupMembersSnapshot = await db.collection(COLLECTIONS.GROUP_MEMBERS)
      .where('user_id', '==', user.id)
      .get();

    const groupIds = groupMembersSnapshot.docs.map(doc => doc.data().group_id);

    // Also check for personal expenses (non-group expenses)
    const personalExpensesSnapshot = await db.collection(COLLECTIONS.EXPENSES)
      .where('paid_by', '==', user.id)
      .where('group_id', '==', null)
      .get();

    if (groupIds.length === 0 && personalExpensesSnapshot.docs.length === 0) {
      return NextResponse.json([]);
    }

    // Get existing settlements to exclude settled amounts
    const settlementsSnapshot = await db.collection(COLLECTIONS.SETTLEMENTS)
      .where('from_user_id', '==', user.id)
      .get();

    const toSettlementsSnapshot = await db.collection(COLLECTIONS.SETTLEMENTS)
      .where('to_user_id', '==', user.id)
      .get();

    // Calculate settled amounts per user
    const settledAmounts = new Map<string, number>();
    
    console.log('🔍 Pending API - Processing settlements where user is receiver...');
    // Process settlements where user is the receiver (someone paid user)
    settlementsSnapshot.docs.forEach(doc => {
      const settlement = docToObject(doc);
      if (settlement.to_user_id) {
        const currentAmount = settledAmounts.get(settlement.to_user_id) || 0;
        const newAmount = currentAmount + Number(settlement.amount);
        settledAmounts.set(settlement.to_user_id, newAmount);
        
        // Debug for Bunny specifically
        if (settlement.to_user_id === '38DSoc14eSVYEAmkBSmjXb2iMom2') {
          console.log('🔍 Pending API - Bunny receiver settlement:', {
            from_user_id: settlement.from_user_id,
            to_user_id: settlement.to_user_id,
            amount: settlement.amount,
            currentAmount,
            newAmount
          });
        }
      }
    });

    console.log('🔍 Pending API - Processing settlements where user is payer...');
    // Process settlements where user is the payer (user paid someone)
    toSettlementsSnapshot.docs.forEach(doc => {
      const settlement = docToObject(doc);
      if (settlement.from_user_id) {
        const currentAmount = settledAmounts.get(settlement.from_user_id) || 0;
        const newAmount = currentAmount - Number(settlement.amount);
        settledAmounts.set(settlement.from_user_id, newAmount);
        
        // Debug for Bunny specifically
        if (settlement.from_user_id === '38DSoc14eSVYEAmkBSmjXb2iMom2') {
          console.log('🔍 Pending API - Bunny payer settlement:', {
            from_user_id: settlement.from_user_id,
            to_user_id: settlement.to_user_id,
            amount: settlement.amount,
            currentAmount,
            newAmount
          });
        }
      }
    });

    console.log('🔍 Pending API - Final settled amounts:', Object.fromEntries(settledAmounts));

    // Get all pending settlements across all groups
    const allPendingSettlements = [];

    // Process each group
    for (const groupId of groupIds) {
      try {
        // Get members for this group
        const membersSnapshot = await db.collection(COLLECTIONS.GROUP_MEMBERS)
          .where('group_id', '==', groupId)
          .get();

        // Get group details
        const groupDoc = await db.collection(COLLECTIONS.GROUPS).doc(groupId).get();
        const groupData = groupDoc.exists ? groupDoc.data() : null;

        const members = membersSnapshot.docs.map((d) => {
          const m: any = docToObject(d);
          return {
            id: m.id,
            user_id: m.user_id || null,
            name: m.name,
            email: m.email || null,
            phone: m.phone || null,
            is_registered: !!m.is_registered,
          };
        });

        const memberById = new Map(members.map((m) => [m.id, m]));
        const memberIdByUserId = new Map(
          members.filter((m) => m.user_id).map((m) => [m.user_id as string, m.id]),
        );

        // Get expenses for this group
        const expensesSnapshot = await db.collection(COLLECTIONS.EXPENSES)
          .where('group_id', '==', groupId)
          .get();

        const expenses = expensesSnapshot.docs.map((d) => {
          const e: any = docToObject(d);
          return {
            id: e.id,
            amount: Number(e.amount || 0),
            paid_by: e.paid_by,
          };
        });

        // Get splits for this group
        const expenseIds = expenses.map((e) => e.id);
        const splits: any[] = [];
        
        if (expenseIds.length > 0) {
          for (let i = 0; i < expenseIds.length; i += 10) {
            const batch = expenseIds.slice(i, i + 10);
            const splitsSnapshot = await db.collection(COLLECTIONS.EXPENSE_SPLITS)
              .where('expense_id', 'in', batch)
              .get();

            splitsSnapshot.docs.forEach((doc) => {
              const s: any = docToObject(doc);
              splits.push({
                id: s.id,
                expense_id: s.expense_id,
                member_id: s.member_id,
                amount: Number(s.amount || 0),
                is_paid: !!s.is_paid,
              });
            });
          }
        }

        // Calculate balances (same logic as groups/balances API)
        const shareByMember = new Map<string, number>();
        const paidByMember = new Map<string, number>();

        // Initialize
        members.forEach((m) => {
          shareByMember.set(m.id, 0);
          paidByMember.set(m.id, 0);
        });

        // Calculate totals
        expenses.forEach((e) => {
          const payerMemberId = memberIdByUserId.get(e.paid_by);
          if (payerMemberId) {
            paidByMember.set(payerMemberId, (paidByMember.get(payerMemberId) || 0) + e.amount);
          }
        });

        splits.forEach((s) => {
          shareByMember.set(s.member_id, (shareByMember.get(s.member_id) || 0) + s.amount);
        });

        // Calculate transfers
        const payerMemberIdByExpenseId = new Map<string, string | null>();
        expenses.forEach((e) => {
          const memberId = memberIdByUserId.get(e.paid_by);
          payerMemberIdByExpenseId.set(e.id, memberId || null);
        });

        const owedPairTotals = new Map<string, number>();
        for (const s of splits) {
          const payerMemberId = payerMemberIdByExpenseId.get(s.expense_id) || null;
          if (!payerMemberId) continue;
          if (s.member_id === payerMemberId) continue;
          if (s.amount <= 0) continue;
          
          const key = `${s.member_id}->${payerMemberId}`;
          owedPairTotals.set(key, round2((owedPairTotals.get(key) || 0) + Number(s.amount)));
        }

        // Extract transfers where current user is involved
        for (const [key, amount] of owedPairTotals.entries()) {
          const [fromId, toId] = key.split('->');
          const fromMember = memberById.get(fromId);
          const toMember = memberById.get(toId);
          
          if (!fromMember || !toMember) continue;

          // Check if current user is involved
          const isFromUser = fromMember.user_id === user.id;
          const isToUser = toMember.user_id === user.id;
          
          if (!isFromUser && !isToUser) continue;

          // Determine settlement type and other person
          let type: "owes_you" | "you_owe";
          let otherPerson: any;

          if (isFromUser) {
            // User is the one who OWES money (fromId)
            type = "you_owe";
            otherPerson = toMember;
          } else if (isToUser) {
            // User is the one who is OWED money (toId, they paid)
            type = "owes_you";
            otherPerson = fromMember;
          } else {
            continue; // User not involved
          }

          // Debug logging for Bunny specifically
          if (otherPerson.name && otherPerson.name.toLowerCase().includes('bunny')) {
            console.log('🔍 Pending API - Bunny settlement found:', {
              fromMember: fromMember.name,
              toMember: toMember.name,
              amount,
              type,
              isFromUser,
              isToUser
            });
          }

          // Get member name
          let memberName = otherPerson.name;
          if (otherPerson.user_id) {
            try {
              const userDoc = await db.collection(COLLECTIONS.USERS).doc(otherPerson.user_id).get();
              if (userDoc.exists) {
                const userData = userDoc.data();
                if (userData) {
                  memberName = userData.full_name || userData.email?.split('@')[0] || otherPerson.name;
                }
              }
            } catch {
              // Use stored name if user fetch fails
            }
          }

          const initials = memberName.split(" ").map((n: string) => n[0]).join("").toUpperCase().slice(0, 2);

          allPendingSettlements.push({
            id: `${groupId}-${otherPerson.id}`,
            name: memberName,
            initials,
            amount,
            type,
            lastReminder: null,
            userId: otherPerson.user_id,
            groupId: groupId,
            groupName: groupData?.name || 'Unknown Group',
            memberEmail: otherPerson.email || null,
            memberPhone: otherPerson.phone || null,
            isRegistered: otherPerson.is_registered || false
          });
        }
      } catch (error) {
        console.error(`Error processing group ${groupId}:`, error);
        continue;
      }
    }

    // Aggregate amounts for the same person across multiple groups
    const aggregatedSettlements = new Map();
    
    console.log('🔍 Pending API - All pending settlements before filtering:', allPendingSettlements);
    
    for (const settlement of allPendingSettlements) {
      const key = settlement.userId || settlement.name;
      const existing = aggregatedSettlements.get(key);
      
      // Debug logging for Bunny specifically
      if (settlement.name && settlement.name.toLowerCase().includes('bunny')) {
        console.log('🔍 Pending API - Processing Bunny settlement:', {
          name: settlement.name,
          amount: settlement.amount,
          type: settlement.type,
          key,
          existing: existing ? 'found' : 'not found'
        });
      }
      
      if (existing) {
        // Aggregate amounts
        if (existing.type === settlement.type) {
          existing.amount += settlement.amount;
          // Merge group information
          if (settlement.groupId && !existing.groups.includes(settlement.groupId)) {
            existing.groups.push(settlement.groupId);
            existing.groupNames.push(settlement.groupName);
          }
        } else {
          // If types are different, calculate net
          const currentAmount = existing.amount;
          
          if (settlement.name && settlement.name.toLowerCase().includes('bunny')) {
            console.log('🔍 Pending API - Bunny aggregation - different types:', {
              existingType: existing.type,
              existingAmount: currentAmount,
              newType: settlement.type,
              newAmount: settlement.amount
            });
          }
          
          if (settlement.amount > currentAmount) {
            existing.amount = settlement.amount - currentAmount;
            existing.type = settlement.type;
          } else {
            existing.amount = currentAmount - settlement.amount;
            existing.type = existing.type;
          }
          
          if (settlement.name && settlement.name.toLowerCase().includes('bunny')) {
            console.log('🔍 Pending API - Bunny aggregation result:', {
              finalAmount: existing.amount,
              finalType: existing.type
            });
          }
        }
      } else {
        aggregatedSettlements.set(key, { 
          ...settlement,
          groups: [settlement.groupId],
          groupNames: [settlement.groupName]
        });
      }
    }

    // Convert to array and sort by amount (highest first)
    const finalSettlements = Array.from(aggregatedSettlements.values())
      .filter(s => s.amount > 0.01)
      .sort((a, b) => b.amount - a.amount);

    console.log('🔍 Pending API - Final settlements to return:', finalSettlements);
    return NextResponse.json(finalSettlements);
  } catch (error: any) {
    console.error('Error calculating pending settlements:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}
