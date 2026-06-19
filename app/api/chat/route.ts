import { GoogleGenAI } from '@google/genai';
import { NextRequest, NextResponse } from 'next/server';
import { adminAuth } from '@/src/lib/firebase-admin';
import { db } from '@/src/db';
import { transactions as txTable, merchants as merchantsTable } from '@/src/db/schema';
import { eq, desc } from 'drizzle-orm';

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const token = authHeader.split('Bearer ')[1];
    const decodedToken = await adminAuth.verifyIdToken(token);
    const uid = decodedToken.uid;
    
    // Get numeric user id
    const { users } = await import('@/src/db/schema');
    const userRecord = await db.select().from(users).where(eq(users.uid, uid)).limit(1);
    if (!userRecord || userRecord.length === 0) {
      return NextResponse.json({ error: 'User not found in DB' }, { status: 404 });
    }
    const userId = userRecord[0].id;

    // Fetch recent transactions
    const recentTxs = await db.select({
      date: txTable.date,
      amount: txTable.amount,
      type: txTable.type,
      category: txTable.category,
      merchantName: merchantsTable.name
    })
    .from(txTable)
    .leftJoin(merchantsTable, eq(txTable.merchantId, merchantsTable.id))
    .where(eq(txTable.userId, userId))
    .orderBy(desc(txTable.createdAt))
    .limit(30);

    const { message, currentBalance } = await req.json();

    const transactionsCtx = JSON.stringify(recentTxs.map(t => ({...t, amount: `₹${t.amount}`})));
    
    const prompt = `You are a helpful AI personal finance assistant named "Copilot AI". 
You give concise, actionable, and friendly answers to the user's questions about their finances.
Keep answers under 3 sentences unless asked for an explanation.
Do not use markdown headers, just plain text or simple bullet points.

The latest synced SBI bank balance of the user is: ₹${currentBalance?.toLocaleString('en-IN') || '2,45,000'}
Here is the user's recent transaction data for context:
${transactionsCtx}

User question: "${message}"`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.5-flash',
      contents: prompt,
    });

    return NextResponse.json({ text: response.text });
  } catch (error) {
    console.error('Chat API Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
