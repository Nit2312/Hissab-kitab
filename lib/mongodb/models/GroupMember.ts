import mongoose, { Schema, Document } from 'mongoose';

export interface IGroupMember extends Document {
  _id: string;
  group_id: mongoose.Types.ObjectId;
  user_id?: mongoose.Types.ObjectId;
  name: string;
  email?: string;
  phone?: string;
  is_registered: boolean;
  created_at: Date;
}

const GroupMemberSchema = new Schema<IGroupMember>(
  {
    group_id: { type: Schema.Types.ObjectId, ref: 'Group', required: true },
    user_id: { type: Schema.Types.ObjectId, ref: 'User' },
    name: { type: String, required: true },
    email: { type: String },
    phone: { type: String },
    is_registered: { type: Boolean, default: false },
    created_at: { type: Date, default: Date.now },
  },
  {
    timestamps: { createdAt: 'created_at', updatedAt: false },
  }
);

export default (mongoose.models && mongoose.models.GroupMember) || mongoose.model<IGroupMember>('GroupMember', GroupMemberSchema);
