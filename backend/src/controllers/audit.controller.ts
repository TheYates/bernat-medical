import type { Request, Response } from 'express';
import { pool } from '../db';
import type { RowDataPacket } from 'mysql2';

export const getAuditLogs = async (req: Request, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 50;
    const offset = (page - 1) * limit;

    const [logs] = await pool.execute(
      `SELECT al.*, u.username, u.full_name 
       FROM audit_log al 
       LEFT JOIN users u ON al.user_id = u.id 
       ORDER BY al.created_at DESC 
       LIMIT ? OFFSET ?`,
      [limit, offset]
    ) as [RowDataPacket[], any];

    // Get total count for pagination
    const [countResult] = await pool.execute(
      'SELECT COUNT(*) as total FROM audit_log'
    ) as [RowDataPacket[], any];

    const total = countResult[0].total;

    res.json({
      data: logs,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('Error fetching audit logs:', error);
    res.status(500).json({ message: 'Server error' });
  }
}; 