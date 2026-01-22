

// No-op middleware to satisfy Next.js requirement for a function export
import { NextResponse } from 'next/server';

export function middleware() {
	return NextResponse.next();
}
