import { NextRequest, NextResponse } from 'next/server';
import { adminAuth } from '@/src/lib/firebase-admin';
import { db } from '@/src/db';
import { transactions, merchants, users } from '@/src/db/schema';
import { eq, desc } from 'drizzle-orm';

export async function GET(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.split('Bearer ')[1];
    const decodedToken = await adminAuth.verifyIdToken(token);
    const uid = decodedToken.uid;

    const userRecord = await db.select().from(users).where(eq(users.uid, uid)).limit(1);
    if (!userRecord || userRecord.length === 0) {
      return NextResponse.json({ error: 'User not found in DB' }, { status: 404 });
    }
    const userId = userRecord[0].id;

    // Join transactions with merchants
    const userTx = await db.select({
      id: transactions.id,
      date: transactions.date,
      amount: transactions.amount,
      type: transactions.type,
      category: transactions.category,
      merchantName: merchants.name
    })
    .from(transactions)
    .leftJoin(merchants, eq(transactions.merchantId, merchants.id))
    .where(eq(transactions.userId, userId))
    .orderBy(desc(transactions.id))
    .limit(50);

    return NextResponse.json(userTx);
  } catch (error) {
    console.error('Error fetching transactions:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
