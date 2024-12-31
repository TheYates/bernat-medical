import { Request, Response } from 'express';
import { pool } from '../db';
import { RowDataPacket, ResultSetHeader } from 'mysql2';
import { AuthenticatedRequest } from '../types/auth';
import { createAuditLog } from '../services/audit.service';

interface DispenseItem {
  prescriptionId: number;
  drugId: number;
  quantity: number;
  price: number;
}

interface PaymentItem {
  method: string;
  amount: number;
}

interface DispenseRequestBody {
  items: DispenseItem[];
  payments: PaymentItem[];
  totalAmount: number;
}

export const getPrescriptionHistory = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const [prescriptions] = await pool.execute<RowDataPacket[]>(
      `SELECT 
        p.id,
        p.created_at as createdAt,
        p.dosage,
        p.frequency,
        p.duration,
        p.route,
        p.quantity,
        p.dispensed,
        JSON_OBJECT(
          'id', d.id,
          'genericName', d.name,
          'strength', d.strength,
          'unit', d.unit
        ) as drug,
        u.full_name as prescribedByName
      FROM prescriptions p
      JOIN drugs d ON p.drug_id = d.id
      JOIN users u ON p.created_by = u.id
      WHERE p.patient_id = ?
      ORDER BY p.created_at DESC`,
      [req.params.patientId]
    );

    // Transform the data to ensure valid dates
    const formattedPrescriptions = prescriptions.map(p => ({
      ...p,
      createdAt: p.createdAt ? new Date(p.createdAt).toISOString() : null
    }));

    res.json(formattedPrescriptions);
  } catch (error) {
    console.error('Error fetching prescription history:', error);
    res.status(500).json({ message: 'Failed to fetch history' });
  }
};

export const createPrescription = async (req: AuthenticatedRequest, res: Response) => {
  const connection = await pool.getConnection();
  
  try {
    await connection.beginTransaction();

    const { items, instructions } = req.body;
    const patientId = req.params.patientId;

    // Log the received data
    console.log('Received prescription data:', req.body);

    // Validate items array
    if (!Array.isArray(items) || items.length === 0) {
      throw new Error('No prescription items provided');
    }

    // Insert each prescription item
    const insertedIds = [];
    for (const item of items) {
      const { drugId, dosage, frequency, duration, route, quantity } = item;

      // Validate required fields for each item
      if (!drugId || !dosage || !frequency || !duration || !quantity || !route) {
        throw new Error('Missing required fields in prescription item');
      }

      const [result] = await connection.execute<ResultSetHeader>(
        `INSERT INTO prescriptions (
          patient_id, 
          drug_id,
          dosage,
          frequency,
          duration,
          quantity,
          route,
          created_by
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          patientId,
          drugId,
          dosage,
          frequency,
          duration,
          quantity,
          route,
          req.user?.id || null
        ]
      );

      insertedIds.push(result.insertId);
    }

    await createAuditLog({
      userId: req.user?.id as number,
      actionType: 'create',
      entityType: 'prescription',
      entityId: insertedIds[0],
      details: `Created ${insertedIds.length} prescriptions for patient ${patientId}`,
      ipAddress: req.ip
    });

    await connection.commit();
    res.status(201).json({ ids: insertedIds });

  } catch (error) {
    await connection.rollback();
    console.error('Error creating prescription:', error);
    res.status(500).json({ 
      message: 'Failed to create prescription',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
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

export const getPendingPrescriptions = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const [prescriptions] = await pool.execute<RowDataPacket[]>(
      `SELECT 
        p.id, 
        p.dosage,
        p.frequency, 
        p.duration, 
        p.quantity, 
        p.dispensed,
        JSON_OBJECT(
          'id', d.id,
          'genericName', d.name,
          'brandName', d.name,
          'form', d.unit,
          'strength', d.strength,
          'salePricePerUnit', d.prescription_price
        ) as drug
      FROM prescriptions p
      JOIN drugs d ON p.drug_id = d.id
      WHERE p.patient_id = ? AND p.dispensed = false`,
      [req.params.patientId]
    );

    res.json(prescriptions);
  } catch (error) {
    console.error('Error fetching pending prescriptions:', error);
    res.status(500).json({ message: 'Failed to fetch prescriptions' });
  }
};

export const dispense = async (req: AuthenticatedRequest, res: Response) => {
  const connection = await pool.getConnection();
  
  try {
    await connection.beginTransaction();

    const { items, payments, totalAmount } = req.body as DispenseRequestBody;

    // Validate request body
    if (!items?.length || !payments?.length || !totalAmount) {
      throw new Error('Missing required fields');
    }

    // Validate each item has required fields
    items.forEach((item: DispenseItem) => {
      if (!item.prescriptionId || !item.drugId || !item.quantity || !item.price) {
        throw new Error('Missing required fields in prescription item');
      }
    });

    // Process each prescription item
    for (const item of items) {
      // Update prescription status
      await connection.execute(
        'UPDATE prescriptions SET dispensed = true, dispensed_at = NOW(), dispensed_by = ? WHERE id = ?',
        [req.user?.id, item.prescriptionId]
      );

      // Update drug stock
      await connection.execute(
        'UPDATE drugs SET stock = stock - ? WHERE id = ?',
        [item.quantity, item.drugId]
      );

      // Record payment
      for (const payment of payments) {
        await connection.execute(
          'INSERT INTO payments (prescription_id, method, amount, created_by) VALUES (?, ?, ?, ?)',
          [item.prescriptionId, payment.method, payment.amount, req.user?.id]
        );
      }
    }

    await createAuditLog({
      userId: req.user?.id as number,
      actionType: 'dispense',
      entityType: 'prescription',
      entityId: items[0].prescriptionId,
      details: `Dispensed ${items.length} items with total amount ${totalAmount}`,
      ipAddress: req.ip
    });

    await connection.commit();
    res.json({ message: 'Prescriptions dispensed successfully' });

  } catch (error) {
    await connection.rollback();
    console.error('Error dispensing prescription:', error);
    res.status(500).json({ 
      message: 'Failed to dispense prescription',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  } finally {
    connection.release();
  }
}; 