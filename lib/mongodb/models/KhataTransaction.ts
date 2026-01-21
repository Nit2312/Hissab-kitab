import mongoose, { Schema, Document } from 'mongoose';

export interface IKhataTransaction extends Document {
  _id: string;
  owner_id: mongoose.Types.ObjectId;
  customer_id: mongoose.Types.ObjectId;
  type: 'credit' | 'payment';
  amount: number;
  description?: string;
  date: Date;
  created_at: Date;
}

const KhataTransactionSchema = new Schema<IKhataTransaction>(
  {
    owner_id: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    customer_id: { type: Schema.Types.ObjectId, ref: 'Customer', required: true },
    type: {
      type: String,
      enum: ['credit', 'payment'],
      required: true,
    },
    amount: { type: Number, required: true },
    description: { type: String },
    date: { type: Date, default: Date.now },
    created_at: { type: Date, default: Date.now },
  },
  {
    timestamps: { createdAt: 'created_at', updatedAt: false },
  }
);

export default (mongoose.models && mongoose.models.KhataTransaction) || mongoose.model<IKhataTransaction>('KhataTransaction', KhataTransactionSchema);
