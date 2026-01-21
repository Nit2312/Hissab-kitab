import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth/auth';
import connectDB from '@/lib/mongodb/connect';
import Group from '@/lib/mongodb/models/Group';
import GroupMember from '@/lib/mongodb/models/GroupMember';
import mongoose from 'mongoose';

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    await connectDB();
    const params = context.params;
    const resolvedParams = params instanceof Promise ? await params : params;
    
    if (!mongoose.Types.ObjectId.isValid(resolvedParams.id)) {
      return NextResponse.json({ error: 'Invalid group ID format' }, { status: 400 });
    }

    const group = await Group.findById(resolvedParams.id).lean();

    if (!group) {
      return NextResponse.json({ error: 'Group not found' }, { status: 404 });
    }

    return NextResponse.json({
      id: (group as any)._id.toString(),
      name: (group as any).name,
      description: (group as any).description || null,
      type: (group as any).type,
      created_by: (group as any).created_by.toString(),
      created_at: (group as any).created_at.toISOString(),
      updated_at: (group as any).updated_at.toISOString(),
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

    await connectDB();
    const params = context.params;
    const resolvedParams = params instanceof Promise ? await params : params;
    
    if (!mongoose.Types.ObjectId.isValid(resolvedParams.id)) {
      return NextResponse.json({ error: 'Invalid group ID format' }, { status: 400 });
    }

    const group = await Group.findById(resolvedParams.id);

    if (!group) {
      return NextResponse.json({ error: 'Group not found' }, { status: 404 });
    }

    // Check if user is the creator
    if (group.created_by.toString() !== user.id) {
      return NextResponse.json({ error: 'Only the group creator can delete the group' }, { status: 403 });
    }

    // Delete group (members and expenses will be deleted via cascade)
    await Group.findByIdAndDelete(resolvedParams.id);

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}
