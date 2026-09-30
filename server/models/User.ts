/**
 * TerminalX - User Mongoose Model
 * Manages user credentials, authentication hashing, and starting virtual balance (₹10,00,000)
 */

import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IUser extends Document {
  name: string;
  email: string;
  passwordHash: string;
  balance: number;
  createdAt: Date;
  updatedAt: Date;
  toSafeObject: () => SafeUser;
}

export interface SafeUser {
  id: string;
  name: string;
  email: string;
  balance: number;
  createdAt: string;
}

export const INITIAL_VIRTUAL_BALANCE = 1000000; // ₹10,00,000 INR default

const UserSchema = new Schema<IUser>(
  {
    name: {
      type: String,
      required: [true, 'Name is required'],
      trim: true,
      minlength: [2, 'Name must be at least 2 characters'],
      maxlength: [60, 'Name must be less than 60 characters'],
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, 'Please provide a valid email address'],
      index: true,
    },
    passwordHash: {
      type: String,
      required: [true, 'Password hash is required'],
      select: false, // Never return in standard queries unless explicitly selected
    },
    balance: {
      type: Number,
      default: INITIAL_VIRTUAL_BALANCE,
      min: [0, 'Balance cannot be negative'],
    },
  },
  {
    timestamps: true,
    toJSON: {
      transform(_doc, ret: any) {
        ret.id = ret._id ? ret._id.toString() : '';
        delete ret._id;
        delete ret.__v;
        delete ret.passwordHash;
        return ret;
      },
    },
  }
);

UserSchema.methods.toSafeObject = function (): SafeUser {
  return {
    id: this._id ? this._id.toString() : '',
    name: this.name,
    email: this.email,
    balance: this.balance,
    createdAt: this.createdAt ? this.createdAt.toISOString() : new Date().toISOString(),
  };
};

export const User: Model<IUser> =
  mongoose.models.User || mongoose.model<IUser>('User', UserSchema);
