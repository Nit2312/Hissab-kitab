import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth/auth';

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    // Return mock data to test the frontend
    const mockData = [
      {
        id: 'test-1',
        name: 'nehnit23@gmail.com',
        initials: 'N',
        amount: 60,
        type: 'you_owe',
        lastReminder: null,
        userId: null,
        groupId: 'U6C3ckx4w0KLx5wn0K79',
        groupName: 'Test 1',
        memberEmail: 'nehnit23@gmail.com',
        memberPhone: null,
        isRegistered: false,
        groups: ['U6C3ckx4w0KLx5wn0K79'],
        groupNames: ['Test 1']
      }
    ];

    return NextResponse.json(mockData);

  } catch (error: any) {
    console.error('Test endpoint error:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}
