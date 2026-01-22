import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth/auth';
import { getFirestoreDB, docToObject } from '@/lib/firebase/admin';
import { COLLECTIONS } from '@/lib/firebase/collections';
import { Timestamp } from 'firebase-admin/firestore';

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const groupId = searchParams.get('group_id');

    if (!groupId) {
      return NextResponse.json({ error: 'group_id is required' }, { status: 400 });
    }

    const db = getFirestoreDB();
    const membersSnapshot = await db.collection(COLLECTIONS.GROUP_MEMBERS)
      .where('group_id', '==', groupId)
      .get();

    // Fetch user details for registered members to ensure we have the latest name
    const membersData = await Promise.all(
      membersSnapshot.docs.map(async (doc) => {
        const m = docToObject(doc);
        let displayName = m.name;
        let displayEmail = m.email || null;
        let displayPhone = m.phone || null;

        // If member is registered, fetch latest user info to ensure name is up to date
        if (m.user_id && m.is_registered) {
          try {
            const userDoc = await db.collection(COLLECTIONS.USERS).doc(m.user_id).get();
            if (userDoc.exists) {
              const userData = userDoc.data();
              // Use user's full_name if available, otherwise email, otherwise phone, otherwise stored name
              displayName = userData?.full_name || userData?.email?.split('@')[0] || userData?.phone || m.name;
              displayEmail = userData?.email || m.email || null;
              displayPhone = userData?.phone || m.phone || null;
            }
          } catch (err) {
            // If user fetch fails, use stored data
            console.error('Error fetching user for member:', err);
          }
        }

        return {
          id: m.id,
          group_id: m.group_id,
          user_id: m.user_id || null,
          name: displayName,
          email: displayEmail,
          phone: displayPhone,
          is_registered: m.is_registered,
          created_at: m.created_at instanceof Date ? m.created_at.toISOString() : m.created_at,
        };
      })
    );

    return NextResponse.json(membersData);
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const { group_id, members } = await request.json();

    if (!group_id || !members || !Array.isArray(members)) {
      return NextResponse.json({ error: 'group_id and members array are required' }, { status: 400 });
    }

    const db = getFirestoreDB();

    // Check for duplicate members before adding
    const existingMembersSnapshot = await db.collection(COLLECTIONS.GROUP_MEMBERS)
      .where('group_id', '==', group_id)
      .get();
    
    const existingMembers = existingMembersSnapshot.docs.map(doc => docToObject(doc));
    const existingUserIds = new Set(
      existingMembers
        .filter(m => m.user_id)
        .map(m => m.user_id!)
    );
    const existingPhones = new Set(
      existingMembers
        .filter(m => m.phone)
        .map(m => m.phone!.replace(/[\s\-\(\)\+]/g, '').toLowerCase())
    );
    const existingEmails = new Set(
      existingMembers
        .filter(m => m.email)
        .map(m => m.email!.toLowerCase().trim())
    );

    const membersToAdd: any[] = [];
    for (const m of members) {
      // Skip if user_id already exists in group
      if (m.user_id && existingUserIds.has(m.user_id)) {
        continue;
      }

      // Skip if phone already exists in group
      if (m.phone) {
        const cleanPhone = m.phone.replace(/[\s\-\(\)\+]/g, '').toLowerCase();
        if (existingPhones.has(cleanPhone)) {
          continue;
        }
      }

      // Skip if email already exists in group
      if (m.email && existingEmails.has(m.email.toLowerCase().trim())) {
        continue;
      }

      membersToAdd.push({
        group_id: group_id,
        name: m.name,
        email: m.email || null,
        phone: m.phone || null,
        user_id: m.user_id || null,
        is_registered: !!m.user_id,
        created_at: Timestamp.now(),
      });

      // Update existing sets to prevent duplicates in the same batch
      if (m.user_id) existingUserIds.add(m.user_id);
      if (m.phone) existingPhones.add(m.phone.replace(/[\s\-\(\)\+]/g, '').toLowerCase());
      if (m.email) existingEmails.add(m.email.toLowerCase().trim());
    }

    if (membersToAdd.length === 0) {
      return NextResponse.json({ error: 'All members already exist in the group' }, { status: 400 });
    }

    // Add members in batch
    const batch = db.batch();
    const createdIds: string[] = [];
    
    membersToAdd.forEach(member => {
      const memberRef = db.collection(COLLECTIONS.GROUP_MEMBERS).doc();
      createdIds.push(memberRef.id);
      batch.set(memberRef, member);
    });
    
    await batch.commit();

    // Fetch created members
    const createdMembers = await Promise.all(
      createdIds.map(id => getDocumentById(COLLECTIONS.GROUP_MEMBERS, id))
    );

    return NextResponse.json({
      success: true,
      members: createdMembers.map(m => ({
        id: m!.id,
        name: m!.name,
        email: m!.email || null,
        phone: m!.phone || null,
      })),
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}

async function getDocumentById(collection: string, id: string) {
  const { getFirestoreDB, docToObject } = await import('@/lib/firebase/admin');
  const db = getFirestoreDB();
  const doc = await db.collection(collection).doc(id).get();
  if (!doc.exists) return null;
  return docToObject(doc);
}
