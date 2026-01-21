import mongoose, { Schema, Document } from 'mongoose';

export interface ISession extends Document {
  _id: string;
  user_id: mongoose.Types.ObjectId;
  session_token: string;
  expires_at: Date;
  created_at: Date;
}

const SessionSchema = new Schema<ISession>(
  {
    user_id: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    session_token: { type: String, required: true, unique: true },
    expires_at: { type: Date, required: true },
    created_at: { type: Date, default: Date.now },
  },
  {
    timestamps: { createdAt: 'created_at', updatedAt: false },
  }
);

// Index for faster lookups
SessionSchema.index({ session_token: 1 }, { unique: true });
// TTL index - automatically delete expired sessions
SessionSchema.index({ expires_at: 1 }, { expireAfterSeconds: 0 });

export default (mongoose.models && mongoose.models.Session) || mongoose.model<ISession>('Session', SessionSchema);
