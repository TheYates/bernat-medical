import { Request, Response } from 'express';
import { pool } from '../db';
import type { RowDataPacket } from 'mysql2';
import { createAuditLog, getClientIp } from '../services/audit.service';
import type { AuthenticatedRequest } from '../types/auth';

export const getClinicSettings = async (req: Request, res: Response) => {
  try {
    const [settings] = await pool.execute(
      'SELECT * FROM clinic_settings LIMIT 1'
    ) as [RowDataPacket[], any];

    if (!settings.length) {
      return res.status(404).json({ message: 'Settings not found' });
    }

    res.json({
      clinicName: settings[0].clinic_name,
      email: settings[0].email,
      phone: settings[0].phone,
      address: settings[0].address,
      idPrefix: settings[0].id_prefix,
      startingNumber: settings[0].starting_number,
      digitLength: settings[0].digit_length,
      lastNumber: settings[0].last_number,
    });
  } catch (error) {
    console.error('Error fetching clinic settings:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

export const updateClinicSettings = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { 
      clinicName, 
      email, 
      phone, 
      address,
      idPrefix,
      startingNumber,
      digitLength 
    } = req.body;

    await pool.execute(
      `UPDATE clinic_settings 
       SET clinic_name = ?, 
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
      entityType: 'settings',
      entityId: 1,
      details: req.body,
      ipAddress: getClientIp(req)
    });

    res.json({ message: 'Settings updated successfully' });
  } catch (error) {
    console.error('Error updating clinic settings:', error);
    res.status(500).json({ message: 'Server error' });
  }
}; 