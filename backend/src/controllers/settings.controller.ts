import type { Request, Response } from 'express';
import { pool } from '../db';
import type { RowDataPacket } from 'mysql2';

export const getClinicSettings = async (req: Request, res: Response) => {
  try {
    const [settings] = await pool.execute(
      'SELECT value FROM settings WHERE `key` = ?',
      ['clinic_id_format']
    ) as [RowDataPacket[], any];

    if (!settings.length) {
      return res.status(404).json({ message: 'Settings not found' });
    }

    res.json(JSON.parse(settings[0].value));
  } catch (error) {
    console.error('Error fetching settings:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

export const updateClinicSettings = async (req: Request, res: Response) => {
  try {
    const { idPrefix, startingNumber, digitLength } = req.body;

    const [settings] = await pool.execute(
      'SELECT value FROM settings WHERE `key` = ?',
      ['clinic_id_format']
    ) as [RowDataPacket[], any];

    const currentSettings = settings.length ? JSON.parse(settings[0].value) : {};
    const newSettings = {
      ...currentSettings,
      idPrefix,
      startingNumber,
      digitLength,
    };

    await pool.execute(
      'UPDATE settings SET value = ? WHERE `key` = ?',
      [JSON.stringify(newSettings), 'clinic_id_format']
    );

    res.json(newSettings);
  } catch (error) {
    console.error('Error updating settings:', error);
    res.status(500).json({ message: 'Server error' });
  }
}; 