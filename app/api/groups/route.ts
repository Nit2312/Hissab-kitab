import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth/auth';
import { getDocumentById, isValidFirestoreId, deleteDocument, updateDocument } from '@/lib/firebase/helpers';
import { getFirestoreDB, docToObject, createDocument, prepareDataForFirestore } from '@/lib/firebase/admin';
import { COLLECTIONS } from '@/lib/firebase/collections';
import { Timestamp } from 'firebase-admin/firestore';
import { broadcastGroupUpdate } from '@/lib/websocket/server';

// Simple cache for groups (5 minutes TTL)
const groupsCache = new Map<string, { data: any; timestamp: number; ttl: number }>();
const CACHE_TTL = 5 * 60 * 1000 // 5 minutes

function getFromCache(key: string): any | null {
  const cached = groupsCache.get(key);
  if (!cached) return null;
  
  const now = Date.now();
  if (now - cached.timestamp > cached.ttl) {
    groupsCache.delete(key);
    return null;
  }
  
  return cached.data;
}

function setCache(key: string, data: any): void {
  groupsCache.set(key, {
    data,
    timestamp: Date.now(),
    ttl: CACHE_TTL
  });
};

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    console.log('🔍 Groups API - User:', user.id, user.email);

    // Check cache first
    const cacheKey = `groups_${user.id}`;
    const cachedData = getFromCache(cacheKey);
    if (cachedData) {
      console.log('🔍 Groups API - Returning cached data for user:', user.id);
      return NextResponse.json(cachedData);
    }

    const db = getFirestoreDB();

    // Get groups where user is a member
    const groupMembersSnapshot = await db.collection(COLLECTIONS.GROUP_MEMBERS)
      .where('user_id', '==', user.id)
      .get();

    const groupIds = groupMembersSnapshot.docs.map(doc => doc.data().group_id);
    
    console.log('🔍 Groups API - Found group memberships:', {
      userId: user.id,
      groupIds,
      memberCount: groupMembersSnapshot.docs.length,
      memberDocs: groupMembersSnapshot.docs.map(doc => ({
        groupId: doc.data().group_id,
        userId: doc.data().user_id,
        name: doc.data().name
      }))
    });

    if (groupIds.length === 0) {
      console.log('🔍 Groups API - No groups found for user:', user.id);
      setCache(cacheKey, []);
      return NextResponse.json([]);
    }

    // Get groups (Firestore 'in' query has limit of 10, so we batch if needed)
    const groups: any[] = [];
    for (let i = 0; i < groupIds.length; i += 10) {
      const batch = groupIds.slice(i, i + 10);
      const groupsSnapshot = await db.collection(COLLECTIONS.GROUPS)
        .where('__name__', 'in', batch)
        .get();
      
      groups.push(...groupsSnapshot.docs.map(doc => docToObject(doc)));
    }

    const groupsData = groups.map(g => ({
      id: g.id,
      name: g.name,
      description: g.description || null,
      type: g.type,
      created_by: g.created_by || null,
      created_at: g.created_at instanceof Date ? g.created_at.toISOString() : g.created_at,
      updated_at: g.updated_at instanceof Date ? g.updated_at.toISOString() : g.updated_at,
    }));

    console.log('🔍 Groups API - Final groups data:', {
      userId: user.id,
      groupsCount: groupsData.length,
      groups: groupsData.map(g => ({ id: g.id, name: g.name, createdBy: g.created_by }))
    });

    // Cache the result
    setCache(cacheKey, groupsData);
    return NextResponse.json(groupsData);
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

    const { name, description, type, members } = await request.json();

    if (!name) {
      return NextResponse.json({ error: 'Group name is required' }, { status: 400 });
    }

    const db = getFirestoreDB();

    // Create group
    const now = Timestamp.now();
    const groupData = {
      name,
      description: description || null,
      type: type || 'other',
      created_by: user.id,
      created_at: now,
      updated_at: now,
    };

    const groupRef = await db.collection(COLLECTIONS.GROUPS).add(groupData);
    const groupDoc = await groupRef.get();
    const group = docToObject(groupDoc);

    // Add creator as member
    await db.collection(COLLECTIONS.GROUP_MEMBERS).add({
      group_id: group.id,
      user_id: user.id,
      name: user.full_name || user.email?.split('@')[0] || 'User',
      email: user.email,
      is_registered: true,
      created_at: now,
    });

    // Add other members if provided
    let membersToAdd: any[] = [];
    if (members && Array.isArray(members) && members.length > 0) {
      membersToAdd = members.map((m: any) => ({
        group_id: group.id,
        name: m.name,
        email: m.email || null,
        phone: m.phone || null,
        is_registered: false,
        created_at: now,
      }));

      const batch = db.batch();
      membersToAdd.forEach(member => {
        const memberRef = db.collection(COLLECTIONS.GROUP_MEMBERS).doc();
        batch.set(memberRef, member);
      });
      await batch.commit();
    }

    // Clear cache for this user
    groupsCache.delete(`groups_${user.id}`);

    // Broadcast WebSocket event for real-time updates
    try {
      // Get all member IDs for broadcasting
      const memberIds = [user.id, ...(members?.map((m: any) => m.user_id) || [])];
      
      broadcastGroupUpdate('updated', {
        id: group.id,
        name: group.name,
        description: group.description || null,
        type: group.type,
        created_by: group.created_by,
        created_at: group.created_at instanceof Date ? group.created_at.toISOString() : group.created_at,
        updated_at: group.updated_at instanceof Date ? group.updated_at.toISOString() : group.updated_at,
        members: membersToAdd.length + 1, // +1 for creator
      }, memberIds);
    } catch (wsError) {
      console.warn('Failed to broadcast WebSocket event:', wsError);
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
