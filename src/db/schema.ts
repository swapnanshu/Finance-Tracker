import { relations } from 'drizzle-orm';
import { pgTable, text, serial, integer, timestamp, numeric, boolean } from 'drizzle-orm/pg-core';

export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  uid: text('uid').notNull().unique(), // Firebase Auth UID
  email: text('email').notNull(),
  createdAt: timestamp('created_at').defaultNow(),
});

export const accounts = pgTable('accounts', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').references(() => users.id).notNull(),
  name: text('name').notNull(),
  type: text('type').notNull(), // Bank, Credit Card, Wallet
  balance: numeric('balance').default('0'),
  createdAt: timestamp('created_at').defaultNow(),
});

export const merchants = pgTable('merchants', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').references(() => users.id).notNull(),
  name: text('name').notNull(),
  aliases: text('aliases').array(),
  defaultCategory: text('default_category'),
  defaultSubcategory: text('default_subcategory'),
  createdAt: timestamp('created_at').defaultNow(),
});

export const transactions = pgTable('transactions', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').references(() => users.id).notNull(),
  accountId: integer('account_id').references(() => accounts.id),
  merchantId: integer('merchant_id').references(() => merchants.id),
  date: text('date').notNull(),
  amount: numeric('amount').notNull(),
  currency: text('currency').default('INR'),
  type: text('type').notNull(), // income, expense, transfer
  source: text('source'), // email, sms, manual
  category: text('category'),
  subcategory: text('subcategory'),
  paymentMethod: text('payment_method'),
  notes: text('notes'),
  confidenceScore: numeric('confidence_score'),
  rawSourceReference: text('raw_source_reference'),
  createdAt: timestamp('created_at').defaultNow(),
});

export const subscriptions = pgTable('subscriptions', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').references(() => users.id).notNull(),
  merchantId: integer('merchant_id').references(() => merchants.id),
  amount: numeric('amount'),
  frequency: text('frequency'), // monthly, yearly
  nextExpectedDate: text('next_expected_date'),
  createdAt: timestamp('created_at').defaultNow(),
});
