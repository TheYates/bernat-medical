import { Request, Response } from 'express';
import { pool } from '../db';
import { RowDataPacket, ResultSetHeader } from 'mysql2';
import { AuthenticatedRequest } from '../types/auth';
import { createAuditLog } from '../services/audit.service';

export const getPrescriptionHistory = async (req: Request, res: Response) => {
  try {
    const { patientId } = req.params;

    const [rows] = await pool.execute(
      `SELECT 
        p.id,
        p.prescribed_at as createdAt,
        p.instructions,
        COALESCE(JSON_ARRAYAGG(
          IF(pi.id IS NOT NULL,
            JSON_OBJECT(
              'id', pi.id,
              'drugId', pi.drug_id,
              'drug', JSON_OBJECT(
                'id', d.id,
                'genericName', d.name,
                'strength', d.strength
              ),
              'dosage', pi.dosage,
              'frequency', pi.frequency,
              'duration', pi.duration,
              'route', pi.route,
              'quantity', pi.quantity
            ),
            NULL
          )
        ), '[]') as items,
        u.full_name as prescribedByName
      FROM prescriptions p
      LEFT JOIN prescription_items pi ON p.id = pi.prescription_id
      LEFT JOIN drugs d ON pi.drug_id = d.id
      LEFT JOIN users u ON p.prescribed_by = u.id
      WHERE p.patient_id = ?
      GROUP BY p.id
      ORDER BY p.prescribed_at DESC`,
      [patientId]
    ) as [RowDataPacket[], any];

    const formattedRows = rows.map(row => ({
      id: row.id,
      createdAt: row.createdAt,
      instructions: row.instructions,
      items: row.items,
      prescribedBy: {
        fullName: row.prescribedByName
      }
    }));

    res.json(formattedRows);
  } catch (error) {
    console.error('Error fetching prescription history:', error);
    res.status(500).json({ message: 'Failed to fetch prescription history' });
  }
};

export const createPrescription = async (req: AuthenticatedRequest, res: Response) => {
  const connection = await pool.getConnection();
  
  try {
    const { items, instructions } = req.body;
    const patientId = req.params.patientId;
    
    await connection.beginTransaction();

    // Create prescription
    const [result] = await connection.execute(
      'INSERT INTO prescriptions (patient_id, instructions, status) VALUES (?, ?, ?)',
      [patientId, instructions || null, 'pending']
    ) as [ResultSetHeader, any];

    const prescriptionId = result.insertId;

    // Create prescription items
    for (const item of items) {
      await connection.execute(
        `INSERT INTO prescription_items 
         (prescription_id, drug_id, dosage, frequency, duration, route, quantity) 
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [prescriptionId, item.drugId, item.dosage, item.frequency, item.duration, item.route, item.quantity]
      );
    }

    await createAuditLog({
      userId: req.user?.id || 0,
      actionType: 'create',
      entityType: 'prescription',
      entityId: prescriptionId.toString(),
      details: { items, instructions },
      ipAddress: req.ip || 'unknown'
    });

    await connection.commit();
    res.status(201).json({ message: 'Prescription created successfully' });
  } catch (error) {
    await connection.rollback();
    console.error('Error creating prescription:', error);
    res.status(500).json({ message: 'Failed to create prescription' });
  } finally {
    connection.release();
  }
};

export const deletePrescription = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const prescriptionId = req.params.id;

    await pool.execute(
      'DELETE FROM prescriptions WHERE id = ? AND status = ?',
      [prescriptionId, 'pending']
    );

    await createAuditLog({
      userId: req.user?.id || 0,
      actionType: 'delete',
      entityType: 'prescription',
      entityId: prescriptionId,
      details: { status: 'pending' },
      ipAddress: req.ip || 'unknown'
    });

    res.json({ message: 'Prescription deleted successfully' });
  } catch (error) {
    console.error('Error deleting prescription:', error);
    res.status(500).json({ message: 'Failed to delete prescription' });
  }
}; 