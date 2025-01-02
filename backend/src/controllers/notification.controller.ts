import { Request, Response } from "express";
import { pool } from "../db";
import type { AuthenticatedRequest } from "../types/auth";
import type { RowDataPacket } from "mysql2";

export const getNotifications = async (
  req: AuthenticatedRequest,
  res: Response
) => {
  try {
    const isAdmin = req.user?.role === "admin";

    const [notifications] = await pool.execute(
      `
      SELECT 
        n.*,
        DATE_FORMAT(n.created_at, '%Y-%m-%dT%H:%i:%s.000Z') as createdAt
      FROM notifications n
      WHERE ${
        isAdmin
          ? 'n.type = "restock_pending"'
          : 'n.user_id = ? AND n.type IN ("restock_approved", "restock_rejected")'
      }
      ORDER BY n.created_at DESC
      LIMIT 50
    `,
      isAdmin ? [] : [req.user?.id]
    );

    res.json(notifications);
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
};

export const markAsRead = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;

    await pool.execute(
      "UPDATE notifications SET is_read = true WHERE id = ? AND user_id = ?",
      [id, req.user?.id]
    );

    res.json({ message: "Notification marked as read" });
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
};
