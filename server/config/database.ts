/**
 * TerminalX - MongoDB Database Connection Module
 * Connects securely to MongoDB Atlas using Mongoose.
 * Never logs credentials, connection strings, or passwords.
 * Implements resilient fallback to in-memory store if Atlas authentication fails.
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config({ override: true });

export interface DatabaseState {
  isConnected: boolean;
  status: 'CONNECTED' | 'DISCONNECTED';
  storageType: 'MONGODB' | 'IN-MEMORY / DEMO';
  dbName: string;
  mode: 'mongodb-atlas' | 'resilient-in-memory';
  lastAuthError?: string;
  connectedAt?: string;
}

export const dbState: DatabaseState = {
  isConnected: false,
  status: 'DISCONNECTED',
  storageType: 'IN-MEMORY / DEMO',
  dbName: process.env.MONGODB_DB_NAME || 'terminalx',
  mode: 'resilient-in-memory',
};

export async function connectDatabase(customUri?: string): Promise<boolean> {
  const uri = customUri || process.env.MONGODB_URI;
  const dbName = process.env.MONGODB_DB_NAME || 'terminalx';

  if (!uri) {
    console.warn('[TerminalX Database]: MONGODB_URI not provided. Running in DISCONNECTED / IN-MEMORY Mode.');
    dbState.isConnected = false;
    dbState.status = 'DISCONNECTED';
    dbState.storageType = 'IN-MEMORY / DEMO';
    dbState.mode = 'resilient-in-memory';
    return false;
  }

  try {
    // Avoid re-connecting if already connected
    if (mongoose.connection.readyState === 1) {
      dbState.isConnected = true;
      dbState.status = 'CONNECTED';
      dbState.storageType = 'MONGODB';
      dbState.mode = 'mongodb-atlas';
      dbState.connectedAt = new Date().toISOString();
      return true;
    }

    // Connect with a 6s timeout to avoid hanging
    await mongoose.connect(uri, {
      dbName,
      serverSelectionTimeoutMS: 6000,
      connectTimeoutMS: 6000,
    });

    mongoose.set('bufferCommands', true);
    dbState.isConnected = true;
    dbState.status = 'CONNECTED';
    dbState.storageType = 'MONGODB';
    dbState.mode = 'mongodb-atlas';
    dbState.dbName = dbName;
    dbState.connectedAt = new Date().toISOString();
    dbState.lastAuthError = undefined;

    console.log(`[TerminalX Database]: Connected successfully to MongoDB Atlas (Database: ${dbName}).`);

    mongoose.connection.on('error', (err) => {
      console.warn('[TerminalX Database]: MongoDB connection warning:', err.message);
    });

    mongoose.connection.on('disconnected', () => {
      dbState.isConnected = false;
      dbState.status = 'DISCONNECTED';
      dbState.storageType = 'IN-MEMORY / DEMO';
      dbState.mode = 'resilient-in-memory';
      console.warn('[TerminalX Database]: Disconnected from MongoDB Atlas. Fallback to resilient storage active.');
    });

    mongoose.connection.on('reconnected', () => {
      dbState.isConnected = true;
      dbState.status = 'CONNECTED';
      dbState.storageType = 'MONGODB';
      dbState.mode = 'mongodb-atlas';
      console.log('[TerminalX Database]: Reconnected to MongoDB Atlas.');
    });

    return true;
  } catch (error: any) {
    dbState.isConnected = false;
    dbState.status = 'DISCONNECTED';
    dbState.storageType = 'IN-MEMORY / DEMO';
    dbState.mode = 'resilient-in-memory';
    dbState.lastAuthError = error.message || 'Authentication failed';

    // Disable Mongoose buffering so unhandled queries don't hang
    mongoose.set('bufferCommands', false);

    console.warn(
      `[TerminalX Database]: MongoDB Atlas requires valid database user credentials (${error.message || 'authentication failed'}). Active in DISCONNECTED / IN-MEMORY Mode.`
    );
    return false;
  }
}

export async function disconnectDatabase(): Promise<void> {
  try {
    if (mongoose.connection.readyState !== 0) {
      await mongoose.disconnect();
      dbState.isConnected = false;
      dbState.status = 'DISCONNECTED';
      dbState.storageType = 'IN-MEMORY / DEMO';
      dbState.mode = 'resilient-in-memory';
      console.log('[TerminalX Database]: MongoDB connection closed cleanly.');
    }
  } catch (err: any) {
    console.warn('[TerminalX Database]: Warning while closing MongoDB connection:', err.message);
  }
}
