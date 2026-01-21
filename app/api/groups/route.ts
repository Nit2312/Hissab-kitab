import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth/auth';
import connectDB from '@/lib/mongodb/connect';
import Group from '@/lib/mongodb/models/Group';
import GroupMember from '@/lib/mongodb/models/GroupMember';
import mongoose from 'mongoose';

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    await connectDB();
    const userId = new mongoose.Types.ObjectId(user.id);

    // Get groups where user is a member
    const groupMembers = await GroupMember.find({ user_id: userId });
    const groupIds = groupMembers.map(gm => gm.group_id);

    const groups = groupIds.length > 0
      ? await Group.find({ _id: { $in: groupIds } })
          .populate('created_by', 'full_name email')
          .lean()
      : [];

    const groupsData = groups.map(g => ({
      id: g._id.toString(),
      name: g.name,
      description: g.description || null,
      type: g.type,
      created_by: (g.created_by as any)?._id.toString() || null,
      created_at: g.created_at.toISOString(),
      updated_at: g.updated_at.toISOString(),
    }));

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

    await connectDB();
    const userId = new mongoose.Types.ObjectId(user.id);

    // Create group
    const group = await Group.create({
      name,
      description: description || undefined,
      type: type || 'other',
      created_by: userId,
    });

    // Add creator as member
    const creatorMember = await GroupMember.create({
      group_id: group._id,
      user_id: userId,
      name: user.full_name || user.email?.split('@')[0] || 'User',
      email: user.email,
      is_registered: true,
    });

    // Add other members if provided
    if (members && Array.isArray(members) && members.length > 0) {
      const membersToAdd = members.map((m: any) => ({
        group_id: group._id,
        name: m.name,
        email: m.email || undefined,
        phone: m.phone || undefined,
        is_registered: false,
      }));

      await GroupMember.insertMany(membersToAdd);
    }

    return NextResponse.json({
      id: group._id.toString(),
      name: group.name,
      description: group.description || null,
      type: group.type,
      created_by: group.created_by.toString(),
      created_at: group.created_at.toISOString(),
      updated_at: group.updated_at.toISOString(),
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}
