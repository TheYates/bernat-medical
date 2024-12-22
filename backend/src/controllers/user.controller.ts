import type { Request, Response } from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { pool } from '../db';
import type { ResultSetHeader, RowDataPacket, FieldPacket } from 'mysql2';
import { createAuditLog, getClientIp } from '../services/audit.service';

export const register = async (req: Request, res: Response) => {
  try {
    const { username, password, fullName, role } = req.body;

    // Check if user already exists
    const [existingUsers] = await pool.execute(
      'SELECT * FROM users WHERE username = ?',
      [username]
    );

    if (Array.isArray(existingUsers) && existingUsers.length > 0) {
      return res.status(400).json({ message: 'Username already taken' });
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Insert user into database
    const [result] = await pool.execute(
      'INSERT INTO users (username, password, full_name, role) VALUES (?, ?, ?, ?)',
      [username, hashedPassword, fullName, role]
    );

    const insertResult = result as ResultSetHeader;
    const userId = insertResult.insertId;

    // Create JWT token
    const token = jwt.sign(
      { id: userId },
      process.env.JWT_SECRET || 'your-secret-key',
      { expiresIn: '1d' }
    );

    res.status(201).json({
      token,
      user: {
        id: userId,
        username,
        fullName,
        role,
      },
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

export const login = async (req: Request, res: Response) => {
  try {
    const { username, password } = req.body;
    console.log('Login attempt:', { username });

    // Check if user exists
    const [users] = await pool.execute(
      'SELECT * FROM users WHERE username = ?',
      [username]
    );

    const user = (users as any[])[0];
    console.log('Found user:', user ? { id: user.id, role: user.role } : 'No user found');

    if (!user) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    // Verify password
    const isValidPassword = await bcrypt.compare(password, user.password);
    console.log('Password check:', { isValid: isValidPassword });

    if (!isValidPassword) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    // Create JWT token
    const token = jwt.sign(
      { id: user.id },
      process.env.JWT_SECRET || 'your-secret-key',
      { expiresIn: '1d' }
    );

    res.json({
      token,
      user: {
        id: user.id,
        username: user.username,
        fullName: user.full_name,
        role: user.role,
        access: user.access,
      },
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

export const getUsers = async (req: Request, res: Response) => {
  try {
    const [users] = await pool.execute(
      'SELECT id, username, full_name, role, access, created_at FROM users'
    );

    // Transform the results to match the frontend types
    const transformedUsers = (users as RowDataPacket[]).map(user => ({
      id: user.id,
      username: user.username,
      fullName: user.full_name,
      role: user.role,
      access: user.access ? JSON.parse(user.access) : [],
      createdAt: user.created_at
    }));

    res.json(transformedUsers);
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

export const createUser = async (req: Request, res: Response) => {
  try {
    const { username, password, fullName, role, access } = req.body;

    // Check if user exists
    const [existingUsers] = await pool.execute(
      'SELECT * FROM users WHERE username = ?',
      [username]
    );

    if (Array.isArray(existingUsers) && existingUsers.length > 0) {
      return res.status(400).json({ message: 'Username already taken' });
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Insert user
    const [result] = await pool.execute(
      'INSERT INTO users (username, password, full_name, role, access) VALUES (?, ?, ?, ?, ?)',
      [username, hashedPassword, fullName, role, JSON.stringify(access)]
    );

    const insertResult = result as ResultSetHeader;
    
    res.status(201).json({
      id: insertResult.insertId,
      username,
      fullName,
      role,
      access,
    });
  } catch (error) {
    console.error('Error creating user:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

export const updateUser = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { fullName, role, access } = req.body;

    // Check if user exists
    const [existingUsers] = await pool.execute(
      'SELECT * FROM users WHERE id = ?',
      [id]
    );

    if (!Array.isArray(existingUsers) || existingUsers.length === 0) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Update user
    await pool.execute(
      'UPDATE users SET full_name = ?, role = ?, access = ? WHERE id = ?',
      [fullName, role, JSON.stringify(access), id]
    );

    res.json({
      id: Number(id),
      fullName,
      role,
      access,
    });
  } catch (error) {
    console.error('Error updating user:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

export const deleteUser = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    // Prevent deleting the last admin
    const [admins] = await pool.execute(
      'SELECT COUNT(*) as count FROM users WHERE role = ?',
      ['admin']
    );
    
    const adminCount = (admins as any[])[0].count;
    
    const [user] = await pool.execute(
      'SELECT role FROM users WHERE id = ?',
      [id]
    ) as [RowDataPacket[], FieldPacket[]];
    
    if (Array.isArray(user) && user[0]?.role === 'admin' && adminCount <= 1) {
      return res.status(400).json({ message: 'Cannot delete the last admin user' });
    }

    const [result] = await pool.execute(
      'DELETE FROM users WHERE id = ?',
      [id]
    );

    const deleteResult = result as ResultSetHeader;
    if (deleteResult.affectedRows === 0) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json({ message: 'User deleted successfully' });
  } catch (error) {
    console.error('Error deleting user:', error);
    res.status(500).json({ message: 'Server error' });
  }
};