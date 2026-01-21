import mongoose, { Schema, Document } from 'mongoose';

export interface IExpense extends Document {
  _id: string;
  group_id?: mongoose.Types.ObjectId;
  description: string;
  amount: number;
  category: 'food' | 'transport' | 'shopping' | 'entertainment' | 'utilities' | 'rent' | 'medical' | 'other' | 'Food' | 'Travel' | 'Bills' | 'Groceries' | 'Shopping' | 'Entertainment';
  paid_by: mongoose.Types.ObjectId;
  split_type: 'equal' | 'unequal' | 'percentage';
  date: Date;
  notes?: string;
  created_at: Date;
  updated_at: Date;
}

const ExpenseSchema = new Schema<IExpense>(
  {
    group_id: { type: Schema.Types.ObjectId, ref: 'Group' },
    description: { type: String, required: true },
    amount: { type: Number, required: true },
    category: {
      type: String,
      enum: ['food', 'transport', 'shopping', 'entertainment', 'utilities', 'rent', 'medical', 'other', 'Food', 'Travel', 'Bills', 'Groceries', 'Shopping', 'Entertainment'],
      default: 'other',
    },
    paid_by: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    split_type: {
      type: String,
      enum: ['equal', 'unequal', 'percentage'],
      default: 'equal',
    },
    date: { type: Date, default: Date.now },
    notes: { type: String },
    created_at: { type: Date, default: Date.now },
    updated_at: { type: Date, default: Date.now },
  },
  {
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
  }
);

export default (mongoose.models && mongoose.models.Expense) || mongoose.model<IExpense>('Expense', ExpenseSchema);
