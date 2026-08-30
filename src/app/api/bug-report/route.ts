import { NextRequest, NextResponse } from 'next/server';
import { saveBugReport } from '@/lib/firebase/firestore';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { type, description, url, userId } = body;

    if (!type || !description) {
      return NextResponse.json({ error: 'Type and description are required.' }, { status: 400 });
    }

    const bugId = await saveBugReport({
      type,
      description,
      url: url || '',
      userId: userId || ''
    });

    return NextResponse.json({ success: true, bugId });
  } catch (error: any) {
    console.error('[BugReport] Failed to save bug report:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
