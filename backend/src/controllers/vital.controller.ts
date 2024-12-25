import { Response } from 'express';
import { pool } from '../db';
import { ResultSetHeader, RowDataPacket } from 'mysql2';
import { AuthenticatedRequest } from '../types/auth';
import { createAuditLog } from '../services/audit.service';

export const recordVitalSigns = async (req: AuthenticatedRequest, res: Response) => {
  const connection = await pool.getConnection();
  
  try {
    await connection.beginTransaction();

    const { 
      patientId, 
      systolic, 
      diastolic, 
      temperatureC,
      temperatureF,
      pulseRate,
      respiratoryRate,
      weight,
      height,
      oxygenSaturation,
      fbs,
      rbs,
      fhr
    } = req.body;

    const [result] = await connection.execute<ResultSetHeader>(
      `INSERT INTO vital_signs (
        patient_id, systolic, diastolic, temperature_c, temperature_f,
        pulse_rate, respiratory_rate, weight, height, oxygen_saturation,
        fbs, rbs, fhr, recorded_by
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        patientId, systolic, diastolic, temperatureC, temperatureF,
        pulseRate, respiratoryRate, weight || null, height || null,
        oxygenSaturation || null, fbs || null, rbs || null, fhr || null,
        req.user?.id
      ]
    );

    await createAuditLog({
      userId: req.user?.id as number,
      actionType: 'create',
      entityType: 'vital_signs',
      entityId: result.insertId,
      details: `Recorded vital signs for patient ${patientId}`,
      ipAddress: req.ip || 'unknown',
    });

    await connection.commit();
    res.status(201).json({ message: 'Vital signs recorded successfully' });

  } catch (error) {
    await connection.rollback();
    console.error('Error recording vital signs:', error);
    res.status(500).json({ message: 'Failed to record vital signs' });
  } finally {
    connection.release();
  }
};

export const getVitalSignsHistory = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const [records] = await pool.execute<RowDataPacket[]>(
      `SELECT 
        vs.*,
        u.full_name as recorder_name
      FROM vital_signs vs
      JOIN users u ON vs.recorded_by = u.id
      WHERE vs.patient_id = ?
      ORDER BY vs.created_at DESC`,
      [req.params.patientId]
    );

    // Transform the response to match frontend expectations
    const transformedRecords = records.map(record => ({
      id: record.id,
      createdAt: record.created_at,
      systolic: record.systolic,
      diastolic: record.diastolic,
      temperatureC: record.temperature_c,
      temperatureF: record.temperature_f,
      pulseRate: record.pulse_rate,
      respiratoryRate: record.respiratory_rate,
      weight: record.weight,
      height: record.height,
      oxygenSaturation: record.oxygen_saturation,
      fbs: record.fbs,
      rbs: record.rbs,
      fhr: record.fhr,
      recordedBy: {
        id: record.recorded_by,
        fullName: record.recorder_name
      }
    }));

    res.json(transformedRecords);
  } catch (error) {
    console.error('Detailed error:', error);
    res.status(500).json({ 
      message: 'Failed to fetch vital signs history',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

export const getWaitingList = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const [requests] = await pool.execute<RowDataPacket[]>(
      `SELECT 
        sr.id,
        sr.patient_id,
        sr.status,
        DATE_FORMAT(sr.created_at, '%Y-%m-%dT%H:%i:%s.000Z') as createdAt,
        JSON_OBJECT(
          'id', p.id,
          'clinicId', p.clinic_id,
          'firstName', p.first_name,
          'middleName', p.middle_name,
          'lastName', p.last_name,
          'dateOfBirth', p.date_of_birth,
          'gender', p.gender
        ) as patient,
        JSON_OBJECT(
          'id', s.id,
          'name', s.name
        ) as service
      FROM service_requests sr
      JOIN patients p ON sr.patient_id = p.id
      JOIN service_request_items sri ON sr.id = sri.request_id
      JOIN services s ON sri.service_id = s.id
      WHERE sr.status = 'pending'
      AND NOT EXISTS (
        SELECT 1 FROM vital_signs vs 
        WHERE vs.patient_id = p.id 
        AND DATE(vs.created_at) = CURDATE()
      )
      ORDER BY sr.created_at ASC`
    );

    // The objects are already parsed by MySQL
    res.json(requests);
  } catch (error) {
    console.error('Error fetching waiting list:', error);
    res.status(500).json({ message: 'Failed to fetch waiting list' });
  }
}; 