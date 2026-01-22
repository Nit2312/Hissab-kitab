import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth/auth';
import { getFirestoreDB, docToObject, createDocument } from '@/lib/firebase/admin';
import { COLLECTIONS } from '@/lib/firebase/collections';
import { Timestamp } from 'firebase-admin/firestore';

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const db = getFirestoreDB();
    const customersSnapshot = await db.collection(COLLECTIONS.CUSTOMERS)
      .where('owner_id', '==', user.id)
      .orderBy('created_at', 'desc')
      .get();

    const customersData = customersSnapshot.docs.map(doc => {
      const c = docToObject(doc);
      return {
        id: c.id,
        name: c.name,
        phone: c.phone || null,
        email: c.email || null,
        address: c.address || null,
        created_at: c.created_at instanceof Date ? c.created_at.toISOString() : c.created_at,
      };
    });

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

    const customer = await createDocument(COLLECTIONS.CUSTOMERS, {
      owner_id: user.id,
      name,
      phone: phone || null,
      email: email || null,
      address: address || null,
    });

    return NextResponse.json({
      id: customer.id,
      name: customer.name,
      phone: customer.phone || null,
      email: customer.email || null,
      address: customer.address || null,
      created_at: customer.created_at instanceof Date ? customer.created_at.toISOString() : customer.created_at,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}
