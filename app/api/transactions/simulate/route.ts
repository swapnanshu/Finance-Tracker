import { NextRequest, NextResponse } from 'next/server';
import { adminAuth } from '@/src/lib/firebase-admin';
import { db } from '@/src/db';
import { transactions, merchants, users } from '@/src/db/schema';
import { eq } from 'drizzle-orm';
import { GoogleGenAI } from '@google/genai';

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

const schema = {
  type: "object",
  properties: {
    merchantName: { type: "string" },
    amount: { type: "number" },
    type: { type: "string", enum: ["expense", "income", "transfer"] },
    category: { type: "string", description: "e.g. Food, Groceries, Shopping, Transport, Utilities" },
    date: { type: "string", description: "YYYY-MM-DD" }
  },
  required: ["merchantName", "amount", "type", "category", "date"]
};

export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.split('Bearer ')[1];
    const decodedToken = await adminAuth.verifyIdToken(token);
    const uid = decodedToken.uid;

    const body = await req.json();
    const { message } = body;

    const userRecord = await db.select().from(users).where(eq(users.uid, uid)).limit(1);
    if (!userRecord || userRecord.length === 0) {
      return NextResponse.json({ error: 'User not found in DB' }, { status: 404 });
    }
    const userId = userRecord[0].id;

    // Use Gemini to parse SMS/Email
    const prompt = `Extract transaction details from this message: "${message}". Assume today's date is ${new Date().toISOString().split('T')[0]} if not specified. Categorize it appropriately.`;
    
    // Call Gemini
    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: schema,
      }
    });

    const parsedText = response.text;
    if (!parsedText) throw new Error("No response from AI");
    
    const data = JSON.parse(parsedText);

    // 1. Get or Create Merchant
    let merchantId = null;
    if (data.merchantName) {
      const existingMerchants = await db.select().from(merchants).where(eq(merchants.name, data.merchantName)).limit(1);
      if (existingMerchants.length > 0) {
        merchantId = existingMerchants[0].id;
      } else {
        const insertMerchant = await db.insert(merchants).values({
           userId,
           name: data.merchantName,
           defaultCategory: data.category
        }).returning({ id: merchants.id });
        merchantId = insertMerchant[0].id;
      }
    }

    // 2. Create Transaction
    await db.insert(transactions).values({
       userId,
       merchantId,
       amount: data.amount.toString(),
       type: data.type,
       category: data.category,
       date: data.date,
       source: 'ai_ingestion',
       confidenceScore: '0.90',
       rawSourceReference: message,
    });

    return NextResponse.json({ success: true, extracted: data });
  } catch (error) {
    console.error('Error simulating sms:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
