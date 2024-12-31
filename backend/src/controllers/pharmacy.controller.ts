import { Response } from 'express';
import { pool } from '../db';
import { ResultSetHeader, RowDataPacket } from 'mysql2';
import { AuthenticatedRequest } from '../types/auth';
import { createAuditLog } from '../services/audit.service';

interface PaymentData {
  [key: string]: number;
}

export const getPendingPrescriptions = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const [prescriptions] = await pool.execute<RowDataPacket[]>(
      `SELECT 
        p.id, p.dosage, p.frequency, p.duration, p.quantity, p.dispensed,
        JSON_OBJECT(
          'id', d.id,
          'genericName', d.generic_name,
          'brandName', d.brand_name,
          'form', d.form,
          'strength', d.strength,
          'salePricePerUnit', d.sale_price_per_unit
        ) as drug
      FROM prescriptions p
      JOIN drugs d ON p.drug_id = d.id
      WHERE p.patient_id = ? AND p.dispensed = false`,
      [req.params.patientId]
    );

    res.json(prescriptions);
  } catch (error) {
    console.error('Error fetching prescriptions:', error);
    res.status(500).json({ message: 'Failed to fetch prescriptions' });
  }
};

export const searchDrugs = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const [drugs] = await pool.execute<RowDataPacket[]>(
      `SELECT 
        id, generic_name as genericName, brand_name as brandName,
        form, strength, sale_price_per_unit as salePricePerUnit,
        stock
      FROM drugs
      WHERE (generic_name LIKE ? OR brand_name LIKE ?)
        AND active = true
        AND stock > 0
      LIMIT 10`,
      [`%${req.query.q}%`, `%${req.query.q}%`]
    );

    res.json(drugs);
  } catch (error) {
    console.error('Error searching drugs:', error);
    res.status(500).json({ message: 'Failed to search drugs' });
  }
};

export const dispensePrescriptions = async (req: AuthenticatedRequest, res: Response) => {
  const connection = await pool.getConnection();
  
  try {
    await connection.beginTransaction();

    const { prescriptionIds, payments } = req.body;
    const totalAmount = Object.values(payments as PaymentData)
      .reduce((sum, amount) => sum + amount, 0);

    // Create sale record
    const [saleResult] = await connection.execute<ResultSetHeader>(
      `INSERT INTO sales (total_amount, created_by) VALUES (?, ?)`,
      [totalAmount, req.user?.id]
    );

    const saleId = saleResult.insertId;

    // Record payments
    for (const [method, amount] of Object.entries(payments)) {
      await connection.execute(
        `INSERT INTO sale_payments (sale_id, payment_method, amount) VALUES (?, ?, ?)`,
        [saleId, method, amount]
      );
    }

    // Update prescriptions and stock
    for (const prescriptionId of prescriptionIds) {
      await connection.execute(
        `UPDATE prescriptions SET 
          dispensed = true,
          dispensed_by = ?,
          dispensed_at = CURRENT_TIMESTAMP,
          sale_id = ?
        WHERE id = ?`,
        [req.user?.id, saleId, prescriptionId]
      );

      // Update stock
      await connection.execute(
        `UPDATE drugs d
         JOIN prescriptions p ON d.id = p.drug_id
         SET d.stock = d.stock - p.quantity
         WHERE p.id = ?`,
        [prescriptionId]
      );
    }

    await createAuditLog({
      userId: req.user?.id as number,
      actionType: 'dispense',
      entityType: 'prescription',
      entityId: saleId,
      details: `Dispensed prescriptions with sale ID: ${saleId}`,
      ipAddress: req.ip
    });

    await connection.commit();
    res.json({ message: 'Prescriptions dispensed successfully' });
  } catch (error) {
    await connection.rollback();
    console.error('Error dispensing prescriptions:', error);
    res.status(500).json({ message: 'Failed to dispense prescriptions' });
  } finally {
    connection.release();
  }
};

export const createSale = async (req: AuthenticatedRequest, res: Response) => {
  const connection = await pool.getConnection();
  
  try {
    await connection.beginTransaction();

    const { items, payments } = req.body;
    const totalAmount = Object.values(payments as PaymentData)
      .reduce((sum, amount) => sum + amount, 0);

    // Create sale record
    const [saleResult] = await connection.execute<ResultSetHeader>(
      `INSERT INTO sales (total_amount, created_by) VALUES (?, ?)`,
      [totalAmount, req.user?.id]
    );

    const saleId = saleResult.insertId;

    // Record payments
    for (const [method, amount] of Object.entries(payments)) {
      await connection.execute(
        `INSERT INTO sale_payments (sale_id, payment_method, amount) VALUES (?, ?, ?)`,
        [saleId, method, amount]
      );
    }

    // Record items and update stock
    for (const item of items) {
      await connection.execute(
        `INSERT INTO sale_items (sale_id, drug_id, quantity, price_per_unit) 
         VALUES (?, ?, ?, ?)`,
        [saleId, item.drugId, item.quantity, item.pricePerUnit]
      );

      await connection.execute(
        `UPDATE drugs SET stock = stock - ? WHERE id = ?`,
        [item.quantity, item.drugId]
      );
    }

    await createAuditLog({
      userId: req.user?.id as number,
      actionType: 'create',
      entityType: 'sale',
      entityId: saleId,
      details: `Created sale with ID: ${saleId}`,
      ipAddress: req.ip
    });

    await connection.commit();
    res.json({ message: 'Sale created successfully' });
  } catch (error) {
    await connection.rollback();
    console.error('Error creating sale:', error);
    res.status(500).json({ message: 'Failed to create sale' });
  } finally {
    connection.release();
  }
};

export const getWaitingList = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const [patients] = await pool.execute<RowDataPacket[]>(
      `SELECT DISTINCT 
        p.id,
        p.clinic_id as clinicId,
        p.first_name as firstName,
        p.middle_name as middleName,
        p.last_name as lastName,
        p.gender,
        p.date_of_birth as dateOfBirth,
        MAX(pr.created_at) as lastPrescriptionDate
      FROM patients p
      JOIN prescriptions pr ON p.id = pr.patient_id
      WHERE pr.dispensed = false
      GROUP BY p.id, p.clinic_id, p.first_name, p.middle_name, p.last_name, p.gender, p.date_of_birth
      ORDER BY lastPrescriptionDate DESC`
    );

    res.json(patients);
  } catch (error) {
    console.error('Error fetching waiting list:', error);
    res.status(500).json({ message: 'Failed to fetch waiting list' });
  }
}; 