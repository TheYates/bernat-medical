import { Request, Response } from 'express';
import { pool } from '../db';
import type { RowDataPacket } from 'mysql2';

export const getAuditLogs = async (req: Request, res: Response) => {
  try {
    const [logs] = await pool.execute(
      `SELECT al.*, u.username, u.full_name 
       FROM audit_log al 
       LEFT JOIN users u ON al.user_id = u.id 
       ORDER BY al.created_at DESC`
    ) as [RowDataPacket[], any];

    res.json({
      data: logs.map(log => ({
        ...log,
        details: JSON.parse(log.details || '{}'),
        fullName: log.full_name
      }))
    });
  } catch (error) {
    console.error('Error fetching audit logs:', error);
    res.status(500).json({ message: 'Server error' });
  }
}; 