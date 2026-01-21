import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth/auth';
import connectDB from '@/lib/mongodb/connect';
import User from '@/lib/mongodb/models/User';
import mongoose from 'mongoose';

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    await connectDB();
    const userDoc = await User.findById(user.id).select('-password').lean();

    if (!userDoc) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    return NextResponse.json({
      id: (userDoc as any)._id.toString(),
      email: (userDoc as any).email,
      full_name: (userDoc as any).full_name || null,
      phone: (userDoc as any).phone || null,
      user_type: (userDoc as any).user_type,
      business_name: (userDoc as any).business_name || null,
      created_at: (userDoc as any).created_at.toISOString(),
      updated_at: (userDoc as any).updated_at.toISOString(),
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const body = await request.json();
    const { full_name, phone, business_name } = body;

    await connectDB();

    // Check if phone number already exists for this user type (if phone is being changed)
    if (phone && phone.trim() && phone.trim() !== user.phone) {
      const existingUser = await User.findOne({
        phone: phone.trim(),
        user_type: user.user_type,
        _id: { $ne: new mongoose.Types.ObjectId(user.id) },
      });

      if (existingUser) {
        return NextResponse.json({
          error: `This phone number is already registered with a ${user.user_type} account.`,
        }, { status: 400 });
      }
    }

    const updatedUser = await User.findByIdAndUpdate(
      user.id,
      {
        full_name: full_name || undefined,
        phone: phone?.trim() || undefined,
        business_name: business_name || undefined,
        updated_at: new Date(),
      },
      { new: true }
    ).select('-password').lean();

    if (!updatedUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    return NextResponse.json({
      id: (updatedUser as any)._id.toString(),
      email: (updatedUser as any).email,
      full_name: (updatedUser as any).full_name || null,
      phone: (updatedUser as any).phone || null,
      user_type: (updatedUser as any).user_type,
      business_name: (updatedUser as any).business_name || null,
      created_at: (updatedUser as any).created_at.toISOString(),
      updated_at: (updatedUser as any).updated_at.toISOString(),
    });
  } catch (error: any) {
    if (error.code === 11000) {
      return NextResponse.json({
        error: 'This phone number is already registered.',
      }, { status: 400 });
    }
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}
