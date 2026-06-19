import { NextRequest, NextResponse } from 'next/server';
import { adminAuth } from '@/src/lib/firebase-admin';
import { db } from '@/src/db';
import { users } from '@/src/db/schema';

export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.split('Bearer ')[1];
    const decodedToken = await adminAuth.verifyIdToken(token);

    const uid = decodedToken.uid;
    const email = decodedToken.email || '';

    // Upsert user in db
    await db.insert(users)
      .values({ uid, email })
      .onConflictDoUpdate({
        target: users.uid,
        set: { email },
      });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error syncing user:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
