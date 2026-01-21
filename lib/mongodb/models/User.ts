import mongoose, { Schema, Document } from 'mongoose';

export interface IUser extends Document {
  _id: string;
  email: string;
  password: string;
  full_name?: string;
  phone?: string;
  user_type: 'personal' | 'business';
  business_name?: string;
  created_at: Date;
  updated_at: Date;
}

const UserSchema = new Schema<IUser>(
  {
    email: { type: String, required: true, unique: true, lowercase: true },
    password: { type: String, required: true },
    full_name: { type: String },
    phone: { type: String },
    user_type: { type: String, enum: ['personal', 'business'], default: 'personal' },
    business_name: { type: String },
    created_at: { type: Date, default: Date.now },
    updated_at: { type: Date, default: Date.now },
  },
  {
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
  }
);

// Index for phone + user_type uniqueness
UserSchema.index({ phone: 1, user_type: 1 }, { unique: true, sparse: true });

export default (mongoose.models && mongoose.models.User) || mongoose.model<IUser>('User', UserSchema);
