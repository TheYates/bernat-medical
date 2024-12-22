import type { Request as ExpressRequest, Response } from 'express';
import { pool } from '../db';
import type { RowDataPacket } from 'mysql2';
import { createAuditLog, getClientIp } from '../services/audit.service';

// Use our extended Request type that includes user
type Request = ExpressRequest & {
  user: {
    id: number;
    role: string;
  }
};

export const getClinicSettings = async (req: Request, res: Response) => {
  try {
    const [settings] = await pool.execute(
      'SELECT * FROM clinic_settings LIMIT 1'
    ) as [RowDataPacket[], any];

    if (!settings.length) {
      return res.status(404).json({ message: 'Settings not found' });
    }

    const {
      clinic_name,
      email,
      phone,
      address,
      id_prefix,
      starting_number,
      digit_length,
      last_number
    } = settings[0];

    res.json({
      clinicName: clinic_name,
      email,
      phone,
      address,
      idPrefix: id_prefix,
      startingNumber: starting_number,
      digitLength: digit_length,
      lastNumber: last_number
    });
  } catch (error) {
    console.error('Error fetching clinic settings:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

export const updateClinicSettings = async (req: Request, res: Response) => {
  try {
    const {
      clinicName,
      email = null,
      phone = null,
      address = null,
      idPrefix,
      startingNumber,
      digitLength
    } = req.body;

    await pool.execute(
      `UPDATE clinic_settings SET 
        clinic_name = ?,
        email = ?,
        phone = ?,
        address = ?,
        id_prefix = ?,
        starting_number = ?,
        digit_length = ?
      WHERE id = 1`,
      [clinicName, email, phone, address, idPrefix, startingNumber, digitLength]
    );

    await createAuditLog({
      userId: req.user?.id || 0,
      actionType: 'update',
      entityType: 'setting',
      details: { type: 'clinic_settings', ...req.body },
      ipAddress: getClientIp(req)
    });

    res.json({
      message: 'Clinic settings updated successfully',
      settings: {
        clinicName,
        email,
        phone,
        address,
        idPrefix,
        startingNumber,
        digitLength
      }
    });
  } catch (error) {
    console.error('Error updating clinic settings:', error);
    res.status(500).json({ message: 'Server error' });
  }
}; 