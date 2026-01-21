import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth/auth';
import connectDB from '@/lib/mongodb/connect';
import User from '@/lib/mongodb/models/User';
import mongoose from 'mongoose';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    await connectDB();
    const userDoc = await User.findById(params.id).select('-password').lean();

    if (!userDoc) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    return NextResponse.json({
      id: (userDoc as any)._id.toString(),
      email: (userDoc as any).email,
      full_name: (userDoc as any).full_name || null,
      phone: (userDoc as any).phone || null,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}
