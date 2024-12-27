import { pool } from '../db';
import type { Request } from 'express';

type ActionType = 'create' | 'update' | 'delete' | 'login' | 'logout' | 'other';
type EntityType = 'user' | 'patient' | 'service' | 'appointment' | 'record' | 'setting' | 'drug' | 'stock';

interface AuditLogData {
  userId: number;
  actionType: ActionType;
  entityType: EntityType;
  entityId: number | string;
  details?: any;
  ipAddress?: string;
}

interface AuditLogParams {
  userId: number;
  actionType: string;
  entityType: string;
  entityId?: string | number;
  details?: any;
  ipAddress?: string;
}

export const createAuditLog = async (data: {
  userId: number | null;
  actionType: string;
  entityType: string;
  entityId?: number | string;
  details?: any;
  ipAddress?: string;
}) => {
  try {
    const actualUserId = data.userId || 3;

    await pool.execute(
      `INSERT INTO audit_log (
        user_id, action_type, entity_type, entity_id, details, ip_address
      ) VALUES (?, ?, ?, ?, ?, ?)`,
      [
        actualUserId,
        data.actionType,
        data.entityType,
        data.entityId,
        JSON.stringify(data.details || {}),
        null
      ]
    );
  } catch (error) {
    console.error('Error creating audit log:', error);
    console.error('Failed to create audit log, continuing anyway');
  }
};

export const getClientIp = (req: Request): string => {
  return req.ip || 
    (req.headers['x-forwarded-for'] as string)?.split(',')[0] || 
    'unknown';
}; 