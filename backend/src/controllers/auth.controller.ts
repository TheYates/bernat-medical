import { Request, Response } from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { pool } from '../db';
import type { RowDataPacket } from 'mysql2';
import type { AuthenticatedRequest } from '../types/auth';

export const login = async (req: Request, res: Response) => {
  try {
    const { username, password } = req.body;

    const [users] = await pool.execute(
      'SELECT id, username, password, full_name, role, access FROM users WHERE username = ?',
      [username]
    ) as [RowDataPacket[], any];

    if (!users.length) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const user = users[0];
    const validPassword = await bcrypt.compare(password, user.password);

    if (!validPassword) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const token = jwt.sign(
      { id: user.id, role: user.role },
      process.env.JWT_SECRET || 'your-secret-key',
      { expiresIn: '24h' }
    );

    res.json({
      token,
      user: {
        id: user.id,
        username: user.username,
        fullName: user.full_name,
        role: user.role,
        access: JSON.parse(user.access || '[]'),
      },
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

export const logout = (req: Request, res: Response) => {
  res.json({ message: 'Logged out successfully' });
};

export const getProfile = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    const [users] = await pool.execute(
      'SELECT id, username, full_name, role FROM users WHERE id = ?',
      [userId]
    ) as [RowDataPacket[], any];

    if (!users.length) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json(users[0]);
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({ message: 'Server error' });
  }
}; 