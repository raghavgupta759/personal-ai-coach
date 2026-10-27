import type { Request, Response, NextFunction } from 'express';
import bcrypt from 'bcryptjs';
import crypto from 'node:crypto';
import { db } from './db.js';

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  preferred_language: string;
  target_role: string | null;
  target_company: string | null;
  experience_level: string | null;
}

// In-memory token store mapped to userId and expiration (persists for server lifecycle)
// Supported in headers: Authorization: Bearer <token>
interface SessionRecord {
  userId: string;
  createdAt: number;
  expiresAt: number;
}
const sessions = new Map<string, SessionRecord>();

// Clean expired sessions periodically
const sessionCleaner = setInterval(() => {
  const now = Date.now();
  for (const [token, record] of sessions.entries()) {
    if (record.expiresAt < now) {
      sessions.delete(token);
    }
  }
}, 60 * 60 * 1000);
if (sessionCleaner.unref) {
  sessionCleaner.unref();
}

export function createSession(userId: string): string {
  const token = crypto.randomBytes(32).toString('hex');
  const sevenDays = 7 * 24 * 60 * 60 * 1000;
  sessions.set(token, {
    userId,
    createdAt: Date.now(),
    expiresAt: Date.now() + sevenDays,
  });
  return token;
}

export function revokeSession(token: string) {
  sessions.delete(token);
}

export function getUserFromToken(token: string): AuthUser | null {
  const session = sessions.get(token);
  if (!session) return null;
  if (session.expiresAt < Date.now()) {
    sessions.delete(token);
    return null;
  }

  const row = db.prepare(`
    SELECT id, name, email, preferred_language, target_role, target_company, experience_level
    FROM app_users WHERE id = ?
  `).get(session.userId) as AuthUser | undefined;

  return row || null;
}

export function logAuditEvent(userId: string | null, eventType: string, metadata: Record<string, any> = {}) {
  try {
    const id = crypto.randomUUID();
    // Sanitize metadata to never contain passwords, tokens, or raw document contents
    const safeMetadata = { ...metadata };
    delete safeMetadata.password;
    delete safeMetadata.token;
    delete safeMetadata.password_hash;
    delete safeMetadata.extractedText;

    db.prepare(`
      INSERT INTO audit_events (id, user_id, event_type, metadata_json)
      VALUES (?, ?, ?, ?)
    `).run(id, userId, eventType, JSON.stringify(safeMetadata));
  } catch (err) {
    console.error('Audit log failed:', err);
  }
}

export function authenticate(req: Request, res: Response, next: NextFunction) {
  let token: string | undefined;

  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.substring(7).trim();
  } else if (req.headers['x-session-token']) {
    token = String(req.headers['x-session-token']).trim();
  }

  if (!token) {
    return res.status(401).json({
      error: { code: 'UNAUTHORIZED', message: 'Authentication required to access this resource.' }
    });
  }

  const user = getUserFromToken(token);
  if (!user) {
    return res.status(401).json({
      error: { code: 'SESSION_EXPIRED', message: 'Session invalid or expired. Please sign in again.' }
    });
  }

  (req as any).user = user;
  (req as any).token = token;
  next();
}
