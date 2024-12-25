import { Request, Response } from 'express';
import { pool } from '../db';
import { createAuditLog } from '../services/audit.service';
import type { AuthenticatedRequest } from '../types/auth';
import type { RowDataPacket } from 'mysql2';

export const registerPatient = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const {
      firstName,
      middleName,
      lastName,
      dateOfBirth,
      gender,
      contact,
      maritalStatus,
      residence,
      emergencyContactName,
      emergencyContactNumber,
      emergencyContactRelation
    } = req.body;

    // Get clinic settings for ID format
    const [settings] = await pool.execute(
      'SELECT id_prefix, digit_length FROM clinic_settings WHERE id = 1'
    ) as [RowDataPacket[], any];

    // Get last patient's clinic ID
    const [lastPatient] = await pool.execute(
      'SELECT clinic_id FROM patients ORDER BY id DESC LIMIT 1'
    ) as [RowDataPacket[], any];

    // Generate next clinic ID
    let nextNumber = 1;
    if (lastPatient.length > 0) {
      const lastId = lastPatient[0].clinic_id;
      const numericPart = parseInt(lastId.replace(settings[0].id_prefix, ''));
      nextNumber = numericPart + 1;
    }

    const clinicId = `${settings[0].id_prefix}${String(nextNumber).padStart(settings[0].digit_length, '0')}`;

    // Insert patient with generated clinic ID
    const [result] = await pool.execute(
      `INSERT INTO patients (
        clinic_id, first_name, middle_name, last_name, 
        date_of_birth, gender, contact, marital_status,
        residence, emergency_contact_name, 
        emergency_contact_number, emergency_contact_relation
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        clinicId, firstName, middleName, lastName,
        dateOfBirth, gender, contact, maritalStatus,
        residence, emergencyContactName,
        emergencyContactNumber, emergencyContactRelation
      ]
    );

    // Create audit log
    await createAuditLog({
      userId: req.user?.id || 0,
      actionType: 'create',
      entityType: 'patient',
      entityId: clinicId,
      details: { ...req.body, clinicId },
      ipAddress: req.ip || 'unknown'
    });

    res.status(201).json({ 
      message: 'Patient registered successfully',
      patientId: clinicId
    });
  } catch (error: any) {
    console.error('Error registering patient:', error);
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(400).json({ 
        message: 'A patient with this clinic ID already exists' 
      });
    }
    res.status(500).json({ message: 'Failed to register patient' });
  }
};

export const getLastPatientId = async (req: Request, res: Response) => {
  try {
    // Get both clinic settings and last patient ID in one response
    const [settings] = await pool.execute(
      'SELECT id_prefix, digit_length FROM clinic_settings WHERE id = 1'
    ) as [RowDataPacket[], any];

    const [lastPatient] = await pool.execute(
      'SELECT clinic_id FROM patients ORDER BY id DESC LIMIT 1'
    ) as [RowDataPacket[], any];

    const prefix = settings[0]?.id_prefix || 'CLN';
    const digitLength = settings[0]?.digit_length || 6;
    const lastId = lastPatient[0]?.clinic_id || null;

    res.json({ 
      settings: {
        prefix,
        digitLength
      },
      lastId
    });
  } catch (error) {
    console.error('Error fetching last patient ID:', error);
    res.status(500).json({ message: 'Failed to fetch last patient ID' });
  }
}; 