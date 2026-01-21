import mongoose, { Schema, Document } from 'mongoose';

export interface IReminder extends Document {
  _id: string;
  from_user_id: mongoose.Types.ObjectId;
  to_user_id?: mongoose.Types.ObjectId;
  to_name?: string;
  to_phone?: string;
  amount: number;
  message?: string;
  status: 'pending' | 'sent' | 'paid' | 'cancelled';
  reminder_type: 'manual' | 'auto';
  sent_at?: Date;
  created_at: Date;
}

const ReminderSchema = new Schema<IReminder>(
  {
    from_user_id: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    to_user_id: { type: Schema.Types.ObjectId, ref: 'User' },
    to_name: { type: String },
    to_phone: { type: String },
    amount: { type: Number, required: true },
    message: { type: String },
    status: {
      type: String,
      enum: ['pending', 'sent', 'paid', 'cancelled'],
      default: 'pending',
    },
    reminder_type: {
      type: String,
      enum: ['manual', 'auto'],
      default: 'manual',
    },
    sent_at: { type: Date },
    created_at: { type: Date, default: Date.now },
  },
  {
    timestamps: { createdAt: 'created_at', updatedAt: false },
  }
);

export default (mongoose.models && mongoose.models.Reminder) || mongoose.model<IReminder>('Reminder', ReminderSchema);
