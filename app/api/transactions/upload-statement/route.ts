import { NextRequest, NextResponse } from 'next/server';
import { adminAuth } from '@/src/lib/firebase-admin';
import { db } from '@/src/db';
import { transactions as txTable } from '@/src/db/schema';
import { eq, desc } from 'drizzle-orm';
import { GoogleGenAI } from '@google/genai';
import { PDFDocument } from 'pdf-lib';

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

    const { users } = await import('@/src/db/schema');
    const userRecord = await db.select().from(users).where(eq(users.uid, uid)).limit(1);
    if (!userRecord || userRecord.length === 0) {
      return NextResponse.json({ error: 'User not found in DB' }, { status: 404 });
    }
    const userId = userRecord[0].id;

    const formData = await req.formData();
    const file = formData.get('file') as File;
    const password = formData.get('password') as string;
    const bank = formData.get('bank') as string;

    if (!file) {
      return NextResponse.json({ error: 'Missing file' }, { status: 400 });
    }

    // Read the PDF buffer
    const arrayBuffer = await file.arrayBuffer();
    let pdfBuffer = new Uint8Array(arrayBuffer);

    // If password provided, attempt to decrypt with pdf-lib
    if (password) {
      try {
        const pdfDoc = await PDFDocument.load(pdfBuffer, { password } as any);
        pdfBuffer = await pdfDoc.save() as any;
      } catch (err) {
        console.error('PDF Decryption Error:', err);
        return NextResponse.json({ error: 'Failed to decrypt PDF. Incorrect password?' }, { status: 400 });
      }
    }

    // Convert decrypted PDF to base64
    const base64Pdf = Buffer.from(pdfBuffer).toString('base64');

    // Fetch existing transactions to prevent duplicates
    const { transactions: txTable, merchants: merchantsTable } = await import('@/src/db/schema');
    const existingTxs = await db.select({
      date: txTable.date,
      amount: txTable.amount,
      merchantName: merchantsTable.name
    })
    .from(txTable)
    .leftJoin(merchantsTable, eq(txTable.merchantId, merchantsTable.id))
    .where(eq(txTable.userId, userId))
    .orderBy(desc(txTable.createdAt))
    .limit(100);

    const prompt = `
You are an expert at extracting financial transactions from credit card statements.
Attached is a PDF statement for ${bank}.

Also, here are the recent transactions already recorded for this user (JSON):
${JSON.stringify(existingTxs.map(t => ({ date: t.date, amount: t.amount, merchantName: t.merchantName })))}

Your task:
1. Extract ALL individual transactions from the PDF statement.
2. Filter out any transactions that match the "already recorded" list. A transaction matches if it has approximately the same amount and date (within a couple of days).
3. Return ONLY the new missing transactions as a raw JSON array of objects.

Each transaction object must have:
- date: 'YYYY-MM-DD' or short format like 'Oct 24'
- merchantName: string
- amount: string representing number (e.g. "1200", "50")
- type: "expense" or "income" (most will be expense on a CC statement, unless it's a payment or refund)
- category: short 1-word category (e.g. "Food", "Utility", "Transport", "Shopping", "Other")

Do not include markdown headers like \`\`\`json. Return only the raw JSON array.
If no new transactions, return [].
`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.5-flash',
      contents: [
        {
          inlineData: {
            mimeType: 'application/pdf',
            data: base64Pdf,
          }
        },
        prompt
      ],
    });

    let rawText = response.text?.trim() || '[]';
    if (rawText.startsWith('```json')) {
      rawText = rawText.substring(7);
      if (rawText.endsWith('```')) {
        rawText = rawText.substring(0, rawText.length - 3);
      }
    } else if (rawText.startsWith('```')) {
      rawText = rawText.substring(3);
      if (rawText.endsWith('```')) {
        rawText = rawText.substring(0, rawText.length - 3);
      }
    }

    const newTransactions = JSON.parse(rawText.trim());

    if (newTransactions.length > 0) {
      for (const tx of newTransactions) {
        let merchantId = null;
        if (tx.merchantName) {
          const existingMerchants = await db.select().from(merchantsTable).where(eq(merchantsTable.name, tx.merchantName)).limit(1);
          if (existingMerchants.length > 0) {
            merchantId = existingMerchants[0].id;
          } else {
            const insertMerchant = await db.insert(merchantsTable).values({
               userId,
               name: tx.merchantName,
               defaultCategory: tx.category || 'Other'
            }).returning({ id: merchantsTable.id });
            merchantId = insertMerchant[0].id;
          }
        }
        
        await db.insert(txTable).values({
          userId,
          merchantId,
          date: tx.date || new Date().toISOString().split('T')[0],
          amount: tx.amount.toString(),
          type: tx.type === 'income' ? 'income' : 'expense',
          category: tx.category || 'Other',
          source: 'pdf_statement'
        });
      }
    }

    return NextResponse.json({ success: true, count: newTransactions.length });
  } catch (error) {
    console.error('Upload API Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
