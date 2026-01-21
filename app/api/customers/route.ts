import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth/auth';
import connectDB from '@/lib/mongodb/connect';
import Customer from '@/lib/mongodb/models/Customer';
import mongoose from 'mongoose';

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    await connectDB();
    const customers = await Customer.find({ owner_id: new mongoose.Types.ObjectId(user.id) })
      .sort({ created_at: -1 })
      .lean();

    const customersData = customers.map(c => ({
      id: c._id.toString(),
      name: c.name,
      phone: c.phone || null,
      email: c.email || null,
      address: c.address || null,
      created_at: c.created_at.toISOString(),
    }));

    return NextResponse.json(customersData);
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

    const { name, phone, email, address } = await request.json();

    if (!name) {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 });
    }

    await connectDB();
    const customer = await Customer.create({
      owner_id: new mongoose.Types.ObjectId(user.id),
      name,
      phone: phone || undefined,
      email: email || undefined,
      address: address || undefined,
    });

    return NextResponse.json({
      id: customer._id.toString(),
      name: customer.name,
      phone: customer.phone || null,
      email: customer.email || null,
      address: customer.address || null,
      created_at: customer.created_at.toISOString(),
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}
