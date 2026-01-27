import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth/auth';
import { getDocumentById, isValidFirestoreId, deleteDocument, updateDocument } from '@/lib/firebase/helpers';
import { getFirestoreDB, docToObject, createDocument, prepareDataForFirestore } from '@/lib/firebase/admin';
import { COLLECTIONS } from '@/lib/firebase/collections';
import { Timestamp } from 'firebase-admin/firestore';
import { broadcastGroupUpdate } from '@/lib/websocket/server';

// Enhanced cache with LRU eviction and better performance
interface CacheEntry {
  data: any;
  timestamp: number;
  ttl: number;
  hits: number;
}

class LRUCache<K, V> {
  private cache = new Map<K, CacheEntry>();
  private maxSize: number;

  constructor(maxSize: number = 100) {
    this.maxSize = maxSize;
  }

  get(key: K): V | null {
    const entry = this.cache.get(key);
    if (!entry) return null;
    
    const now = Date.now();
    if (now - entry.timestamp > entry.ttl) {
      this.cache.delete(key);
      return null;
    }
    
    // Update hit count and move to end (LRU)
    entry.hits++;
    this.cache.delete(key);
    this.cache.set(key, entry);
    
    return entry.data;
  }

  set(key: K, data: V, ttl: number): void {
    // Remove oldest if at max size
    if (this.cache.size >= this.maxSize) {
      const firstKey = this.cache.keys().next().value;
      if (firstKey !== undefined) {
        this.cache.delete(firstKey);
      }
    }
    
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl,
      hits: 0
    });
  }

  delete(key: K): boolean {
    return this.cache.delete(key);
  }

  clear(): void {
    this.cache.clear();
  }

  size(): number {
    return this.cache.size;
  }
}

// Optimized cache instances
const groupsCache = new LRUCache<string, any>(50);
const membersCache = new LRUCache<string, any>(100);
const CACHE_TTL = 10 * 60 * 1000 // 10 minutes
const MEMBERS_CACHE_TTL = 5 * 60 * 1000 // 5 minutes

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    // Check cache first
    const cacheKey = `groups_${user.id}`;
    const cachedData = groupsCache.get(cacheKey);
    if (cachedData) {
      return NextResponse.json(cachedData);
    }

    const db = getFirestoreDB();

    // Get groups where user is a member
    const groupMembersSnapshot = await db.collection(COLLECTIONS.GROUP_MEMBERS)
      .where('user_id', '==', user.id)
      .get();

    const groupIds = groupMembersSnapshot.docs.map(doc => doc.data().group_id);

    if (groupIds.length === 0) {
      groupsCache.set(cacheKey, [], CACHE_TTL);
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

    // Cache the result
    groupsCache.set(cacheKey, groupsData, CACHE_TTL);
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
