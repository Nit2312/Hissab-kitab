import mongoose, { Schema, Document } from 'mongoose';

export interface ICustomer extends Document {
  _id: string;
  owner_id: mongoose.Types.ObjectId;
  name: string;
  phone?: string;
  email?: string;
  address?: string;
  notes?: string;
  created_at: Date;
  updated_at: Date;
}

const CustomerSchema = new Schema<ICustomer>(
  {
    owner_id: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    name: { type: String, required: true },
    phone: { type: String },
    email: { type: String },
    address: { type: String },
    notes: { type: String },
    created_at: { type: Date, default: Date.now },
    updated_at: { type: Date, default: Date.now },
  },
  {
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
  }
);

export default (mongoose.models && mongoose.models.Customer) || mongoose.model<ICustomer>('Customer', CustomerSchema);
