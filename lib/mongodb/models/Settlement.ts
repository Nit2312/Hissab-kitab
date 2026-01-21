import mongoose, { Schema, Document } from 'mongoose';

export interface ISettlement extends Document {
  _id: string;
  from_user_id: mongoose.Types.ObjectId;
  to_user_id: mongoose.Types.ObjectId;
  group_id?: mongoose.Types.ObjectId;
  amount: number;
  payment_method?: 'cash' | 'upi' | 'bank_transfer' | 'other';
  status: 'pending' | 'completed' | 'cancelled';
  notes?: string;
  settled_at: Date;
  created_at: Date;
}

const SettlementSchema = new Schema<ISettlement>(
  {
    from_user_id: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    to_user_id: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    group_id: { type: Schema.Types.ObjectId, ref: 'Group' },
    amount: { type: Number, required: true },
    payment_method: {
      type: String,
      enum: ['cash', 'upi', 'bank_transfer', 'other'],
    },
    status: {
      type: String,
      enum: ['pending', 'completed', 'cancelled'],
      default: 'completed',
    },
    notes: { type: String },
    settled_at: { type: Date, default: Date.now },
    created_at: { type: Date, default: Date.now },
  },
  {
    timestamps: { createdAt: 'created_at', updatedAt: false },
  }
);

export default (mongoose.models && mongoose.models.Settlement) || mongoose.model<ISettlement>('Settlement', SettlementSchema);
