import { Request, Response } from 'express';
import { pool } from '../db';
import { RowDataPacket, ResultSetHeader } from 'mysql2';
import { AuthenticatedRequest } from '../types/auth';
import { createAuditLog } from '../services/audit.service';

export const createConsultation = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { patientId } = req.params;
    const { 
      complaints, 
      clinicalNotes, 
      diagnosis, 
      treatment,
      treatmentNotes,
      prescriptions 
    } = req.body;

    const connection = await pool.getConnection();
    
    try {
      await connection.beginTransaction();

      // Insert consultation
      const [result] = await connection.execute(
        `INSERT INTO consultations (
          patient_id,
          created_by,
          complaints,
          clinical_notes,
          diagnosis,
          treatment_plan
        ) VALUES (?, ?, ?, ?, ?, ?)`,
        [
          patientId,
          req.user?.id,
          complaints,
          clinicalNotes || null,
          diagnosis,
          treatment || null
        ]
      ) as [ResultSetHeader, any];

      const consultationId = result.insertId;

      // Create audit log
      await createAuditLog({
        userId: req.user?.id || 0,
        actionType: 'create',
        entityType: 'consultation',
        entityId: consultationId,
        details: `Created consultation for patient ${patientId}`
      });

      await connection.commit();
      
      res.status(201).json({
        id: consultationId,
        message: 'Consultation created successfully'
      });
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  } catch (error) {
    console.error('Error creating consultation:', error);
    res.status(500).json({ message: 'Failed to create consultation' });
  }
}; 

export const getComplaintsHistory = async (req: Request, res: Response) => {
  try {
    const { patientId } = req.params;
    
    const [rows] = await pool.execute(
      `SELECT 
        c.id as consultationId,
        c.complaints as content,
        c.created_at as createdAt,
        u.full_name as createdByName
      FROM consultations c
      LEFT JOIN users u ON c.created_by = u.id
      WHERE c.patient_id = ? AND c.complaints IS NOT NULL
      ORDER BY c.created_at DESC`,
      [patientId]
    ) as [RowDataPacket[], any];

    const formattedRows = rows.map(row => ({
      id: row.consultationId,
      consultationId: row.consultationId,
      content: row.content,
      createdAt: row.createdAt,
      createdBy: {
        fullName: row.createdByName
      }
    }));

    res.json(formattedRows);
  } catch (error) {
    console.error('Error fetching complaints history:', error);
    res.status(500).json({ message: 'Failed to fetch complaints history' });
  }
};

export const getClinicalNotesHistory = async (req: Request, res: Response) => {
  try {
    const { patientId } = req.params;
    
    const [rows] = await pool.execute(
      `SELECT 
        c.id,
        c.clinical_notes as content,
        c.created_at as createdAt,
        u.full_name as createdByName
      FROM consultations c
      LEFT JOIN users u ON c.created_by = u.id
      WHERE c.patient_id = ? AND c.clinical_notes IS NOT NULL
      ORDER BY c.created_at DESC`,
      [patientId]
    ) as [RowDataPacket[], any];

    const formattedRows = rows.map(row => ({
      ...row,
      createdBy: {
        fullName: row.createdByName
      },
      createdByName: undefined
    }));

    res.json(formattedRows);
  } catch (error) {
    console.error('Error fetching clinical notes history:', error);
    res.status(500).json({ message: 'Failed to fetch clinical notes history' });
  }
};

export const getDiagnosisHistory = async (req: Request, res: Response) => {
  try {
    const { patientId } = req.params;
    
    const [rows] = await pool.execute(
      `SELECT 
        c.id,
        c.diagnosis as content,
        c.created_at as createdAt,
        u.full_name as createdByName
      FROM consultations c
      LEFT JOIN users u ON c.created_by = u.id
      WHERE c.patient_id = ? AND c.diagnosis IS NOT NULL
      ORDER BY c.created_at DESC`,
      [patientId]
    ) as [RowDataPacket[], any];

    const formattedRows = rows.map(row => ({
      ...row,
      createdBy: {
        fullName: row.createdByName
      },
      createdByName: undefined
    }));

    res.json(formattedRows);
  } catch (error) {
    console.error('Error fetching diagnosis history:', error);
    res.status(500).json({ message: 'Failed to fetch diagnosis history' });
  }
};

export const getTreatmentHistory = async (req: Request, res: Response) => {
  try {
    const { patientId } = req.params;
    
    const [rows] = await pool.execute(
      `SELECT 
        c.id,
        c.treatment_plan as content,
        c.created_at as createdAt,
        u.full_name as createdByName
      FROM consultations c
      LEFT JOIN users u ON c.created_by = u.id
      WHERE c.patient_id = ? AND c.treatment_plan IS NOT NULL
      ORDER BY c.created_at DESC`,
      [patientId]
    ) as [RowDataPacket[], any];

    const formattedRows = rows.map(row => ({
      ...row,
      createdBy: {
        fullName: row.createdByName
      },
      createdByName: undefined
    }));

    res.json(formattedRows);
  } catch (error) {
    console.error('Error fetching treatment history:', error);
    res.status(500).json({ message: 'Failed to fetch treatment history' });
  }
};

export const getConsultationDetails = async (req: Request, res: Response) => {
  try {
    const { patientId, consultationId } = req.params;
    
    const [rows] = await pool.execute(
      `SELECT 
        c.id,
        c.complaints,
        c.clinical_notes as clinicalNotes,
        c.diagnosis,
        c.treatment_plan as treatment,
        c.created_at as createdAt,
        u.full_name as createdByFullName
      FROM consultations c
      LEFT JOIN users u ON c.created_by = u.id
      WHERE c.patient_id = ? AND c.id = ?
      LIMIT 1`,
      [patientId, consultationId]
    ) as [RowDataPacket[], any];

    if (rows.length === 0) {
      return res.status(404).json({ message: 'Consultation not found' });
    }

    const row = rows[0] as any; // Type assertion for row access
    const result = {
      id: row.id,
      complaints: row.complaints,
      clinicalNotes: row.clinicalNotes,
      diagnosis: row.diagnosis,
      treatment: row.treatment,
      createdAt: row.createdAt,
      createdBy: {
        fullName: row.createdByFullName
      }
    };

    res.json(result);
  } catch (error) {
    console.error('Error fetching consultation details:', error);
    res.status(500).json({ message: 'Failed to fetch consultation details' });
  }
}; 