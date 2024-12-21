import type { Request, Response } from 'express';
import { pool } from '../db';
import type { ResultSetHeader } from 'mysql2';

export const getServices = async (req: Request, res: Response) => {
  try {
    const [services] = await pool.execute(
      'SELECT * FROM services ORDER BY created_at DESC'
    );
    res.json(services);
  } catch (error) {
    console.error('Error fetching services:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

export const createService = async (req: Request, res: Response) => {
  try {
    const { code, name, category, price, description } = req.body;

    // Check if service code exists
    const [existing] = await pool.execute(
      'SELECT id FROM services WHERE code = ?',
      [code]
    );

    if (Array.isArray(existing) && existing.length > 0) {
      return res.status(400).json({ message: 'Service code already exists' });
    }

    const [result] = await pool.execute(
      'INSERT INTO services (code, name, category, price, description) VALUES (?, ?, ?, ?, ?)',
      [code, name, category, price, description]
    );

    const insertResult = result as ResultSetHeader;
    
    res.status(201).json({
      id: insertResult.insertId,
      code,
      name,
      category,
      price,
      description,
      active: true,
    });
  } catch (error) {
    console.error('Error creating service:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

export const toggleServiceStatus = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const [result] = await pool.execute(
      'UPDATE services SET active = NOT active WHERE id = ?',
      [id]
    );

    const updateResult = result as ResultSetHeader;
    if (updateResult.affectedRows === 0) {
      return res.status(404).json({ message: 'Service not found' });
    }

    res.json({ message: 'Service status updated successfully' });
  } catch (error) {
    console.error('Error toggling service status:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

export const updateService = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { name, category, price, description } = req.body;

    const [result] = await pool.execute(
      'UPDATE services SET name = ?, category = ?, price = ?, description = ? WHERE id = ?',
      [name, category, price, description, id]
    );

    const updateResult = result as ResultSetHeader;
    if (updateResult.affectedRows === 0) {
      return res.status(404).json({ message: 'Service not found' });
    }

    res.json({
      id: Number(id),
      name,
      category,
      price,
      description,
    });
  } catch (error) {
    console.error('Error updating service:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

export const deleteService = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const [result] = await pool.execute(
      'DELETE FROM services WHERE id = ?',
      [id]
    );

    const deleteResult = result as ResultSetHeader;
    if (deleteResult.affectedRows === 0) {
      return res.status(404).json({ message: 'Service not found' });
    }

    res.json({ message: 'Service deleted successfully' });
  } catch (error) {
    console.error('Error deleting service:', error);
    res.status(500).json({ message: 'Server error' });
  }
}; 