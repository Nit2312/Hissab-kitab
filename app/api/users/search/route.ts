import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth/auth';
import connectDB from '@/lib/mongodb/connect';
import User from '@/lib/mongodb/models/User';

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const phone = searchParams.get('phone');
    const email = searchParams.get('email');

    if (!phone && !email) {
      return NextResponse.json({ error: 'phone or email parameter is required' }, { status: 400 });
    }

    await connectDB();
    
    let foundUser = null;
    
    if (phone) {
      // Search for user by phone (exact match after cleaning)
      const cleanPhone = phone.replace(/[\s\-\(\)\+]/g, '');
      // Try exact match first
      foundUser = await User.findOne({
        $or: [
          { phone: cleanPhone },
          { phone: { $regex: `^\\+?${cleanPhone.replace(/^\+/, '')}$`, $options: 'i' } },
          { phone: { $regex: cleanPhone.replace(/^\+/, ''), $options: 'i' } }
        ]
      }).select('-password').lean();
    } else if (email) {
      // Search for user by email (exact match, case-insensitive)
      foundUser = await User.findOne({
        email: { $regex: `^${email}$`, $options: 'i' }
      }).select('-password').lean();
    }

    if (!foundUser) {
      return NextResponse.json(null);
    }

    return NextResponse.json({
      id: (foundUser as any)._id.toString(),
      email: (foundUser as any).email,
      full_name: (foundUser as any).full_name || null,
      phone: (foundUser as any).phone || null,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}
