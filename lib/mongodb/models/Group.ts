import mongoose, { Schema, Document } from 'mongoose';

export interface IGroup extends Document {
  _id: string;
  name: string;
  description?: string;
  type: 'trip' | 'home' | 'couple' | 'friends' | 'family' | 'work' | 'other';
  created_by: mongoose.Types.ObjectId;
  created_at: Date;
  updated_at: Date;
}

const GroupSchema = new Schema<IGroup>(
  {
    name: { type: String, required: true },
    description: { type: String },
    type: {
      type: String,
      enum: ['trip', 'home', 'couple', 'friends', 'family', 'work', 'other'],
      default: 'other',
    },
    created_by: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    created_at: { type: Date, default: Date.now },
    updated_at: { type: Date, default: Date.now },
  },
  {
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
  }
);

export default (mongoose.models && mongoose.models.Group) || mongoose.model<IGroup>('Group', GroupSchema);
