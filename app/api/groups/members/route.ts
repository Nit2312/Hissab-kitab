import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth/auth';
import connectDB from '@/lib/mongodb/connect';
import GroupMember from '@/lib/mongodb/models/GroupMember';
import User from '@/lib/mongodb/models/User';
import mongoose from 'mongoose';

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

    await connectDB();
    const members = await GroupMember.find({
      group_id: new mongoose.Types.ObjectId(groupId),
    }).lean();

    // Fetch user details for registered members to ensure we have the latest name
    const membersData = await Promise.all(
      members.map(async (m) => {
        let displayName = m.name;
        let displayEmail = m.email || null;
        let displayPhone = m.phone || null;

        // If member is registered, fetch latest user info to ensure name is up to date
        if (m.user_id && m.is_registered) {
          try {
            const user = await User.findById(m.user_id).select('full_name email phone').lean();
            if (user) {
              // Use user's full_name if available, otherwise email, otherwise phone, otherwise stored name
              displayName = (user as any).full_name || (user as any).email?.split('@')[0] || (user as any).phone || m.name;
              displayEmail = (user as any).email || m.email || null;
              displayPhone = (user as any).phone || m.phone || null;
            }
          } catch (err) {
            // If user fetch fails, use stored data
            console.error('Error fetching user for member:', err);
          }
        }

        return {
          id: m._id.toString(),
          group_id: m.group_id.toString(),
          user_id: m.user_id?.toString() || null,
          name: displayName,
          email: displayEmail,
          phone: displayPhone,
          is_registered: m.is_registered,
          created_at: m.created_at.toISOString(),
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

    await connectDB();
    const groupObjectId = new mongoose.Types.ObjectId(group_id);

    // Check for duplicate members before adding
    const existingMembers = await GroupMember.find({ group_id: groupObjectId }).lean();
    const existingUserIds = new Set(
      existingMembers
        .filter(m => m.user_id)
        .map(m => m.user_id!.toString())
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

    const membersToAdd = [];
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
        group_id: groupObjectId,
        name: m.name,
        email: m.email || undefined,
        phone: m.phone || undefined,
        user_id: m.user_id ? new mongoose.Types.ObjectId(m.user_id) : undefined,
        is_registered: !!m.user_id,
      });

      // Update existing sets to prevent duplicates in the same batch
      if (m.user_id) existingUserIds.add(m.user_id);
      if (m.phone) existingPhones.add(m.phone.replace(/[\s\-\(\)\+]/g, '').toLowerCase());
      if (m.email) existingEmails.add(m.email.toLowerCase().trim());
    }

    if (membersToAdd.length === 0) {
      return NextResponse.json({ error: 'All members already exist in the group' }, { status: 400 });
    }

    const created = await GroupMember.insertMany(membersToAdd);

    return NextResponse.json({
      success: true,
      members: created.map(m => ({
        id: m._id.toString(),
        name: m.name,
        email: m.email || null,
        phone: m.phone || null,
      })),
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}
