import mongoose, { Schema, Document } from 'mongoose';

export interface IExpenseSplit extends Document {
  _id: string;
  expense_id: mongoose.Types.ObjectId;
  member_id: mongoose.Types.ObjectId;
  amount: number;
  is_paid: boolean;
  created_at: Date;
}

const ExpenseSplitSchema = new Schema<IExpenseSplit>(
  {
    expense_id: { type: Schema.Types.ObjectId, ref: 'Expense', required: true },
    member_id: { type: Schema.Types.ObjectId, ref: 'GroupMember', required: true },
    amount: { type: Number, required: true },
    is_paid: { type: Boolean, default: false },
    created_at: { type: Date, default: Date.now },
  },
  {
    timestamps: { createdAt: 'created_at', updatedAt: false },
  }
);

export default (mongoose.models && mongoose.models.ExpenseSplit) || mongoose.model<IExpenseSplit>('ExpenseSplit', ExpenseSplitSchema);
