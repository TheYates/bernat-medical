import { Request, Response } from "express";
import { pool } from "../db";
import { RowDataPacket } from "mysql2";
import type { AuthenticatedRequest } from "../types/auth";
import crypto from "crypto";

export class PharmacyController {
  static async dispensePrescriptions(req: AuthenticatedRequest, res: Response) {
    const connection = await pool.getConnection();

    try {
      await connection.beginTransaction();
      const { prescriptionIds, payments } = req.body;
      const userId = req.user?.id;

      // Get next session ID
      const [lastSession] = await connection.execute<RowDataPacket[]>(
        "SELECT MAX(session_id) as last_id FROM prescriptions"
      );
      const sessionId = (lastSession[0].last_id || 0) + 1;

      // Create payment records
      const paymentRecords = await Promise.all(
        payments.map(async (payment: { method: string; amount: number }) => {
          const [result] = await connection.execute(
            `INSERT INTO payments (method, amount, recorded_by) 
             VALUES (?, ?, ?)`,
            [payment.method, payment.amount, userId]
          );
          return result;
        })
      );

      // Update prescriptions with session ID
      await connection.execute(
        `UPDATE prescriptions 
         SET dispensed = true, 
             dispensed_by = ?, 
             dispensed_at = NOW(),
             session_id = ?
         WHERE id IN (?)`,
        [userId, sessionId, prescriptionIds.join(",")]
      );

      // Link payments to prescriptions
      for (const prescriptionId of prescriptionIds) {
        await Promise.all(
          paymentRecords.map(async (payment: any) => {
            await connection.execute(
              `INSERT INTO prescription_payments (prescription_id, payment_id)
               VALUES (?, ?)`,
              [prescriptionId, payment.insertId]
            );
          })
        );
      }

      await connection.commit();
      res.json({ success: true });
    } catch (error) {
      await connection.rollback();
      console.error("Error dispensing prescriptions:", error);
      res.status(500).json({ error: "Failed to dispense prescriptions" });
    } finally {
      connection.release();
    }
  }

  static async getWaitingList(req: Request, res: Response) {
    try {
      const [waitingList] = await pool.execute<RowDataPacket[]>(`
        WITH RankedPrescriptions AS (
          SELECT 
            p.*,
            pat.id as patientId,
            pat.clinic_id as clinicId,
            pat.first_name as firstName,
            pat.middle_name as middleName,
            pat.last_name as lastName,
            pat.gender,
            ROW_NUMBER() OVER (PARTITION BY pat.id ORDER BY p.created_at ASC) as rn
          FROM prescriptions p
          JOIN patients pat ON p.patient_id = pat.id
          WHERE p.dispensed = false
        )
        SELECT 
          id,
          created_at,
          patientId,
          clinicId,
          firstName,
          middleName,
          lastName,
          gender
        FROM RankedPrescriptions
        WHERE rn = 1
        ORDER BY created_at ASC
      `);

      const formattedList = waitingList.map((item) => ({
        id: item.id,
        createdAt: item.created_at,
        patient: {
          clinicId: item.clinicId,
          firstName: item.firstName,
          middleName: item.middleName,
          lastName: item.lastName,
          gender: item.gender,
        },
        service: {
          id: "pharmacy",
          name: "Pharmacy",
          category: "pharmacy",
        },
      }));

      res.json(formattedList);
    } catch (error) {
      console.error("Error fetching pharmacy waiting list:", error);
      res.status(500).json({ error: "Failed to fetch pharmacy waiting list" });
    }
  }

  static async getPrescriptionHistory(
    req: AuthenticatedRequest,
    res: Response
  ) {
    const connection = await pool.getConnection();
    const { patientId } = req.params;

    try {
      const [rows] = await connection.execute<RowDataPacket[]>(
        `SELECT 
          pr.session_id,
          pr.created_at,
          pr.dispensed_at,
          SUM(p.amount) as total_amount,
          GROUP_CONCAT(
            JSON_OBJECT(
              'method', p.method,
              'amount', p.amount
            )
          ) as payments,
          GROUP_CONCAT(
            JSON_OBJECT(
              'id', pr.id,
              'drug', JSON_OBJECT(
                'id', d.id,
                'genericName', d.name,
                'strength', d.strength,
                'form', d.unit
              ),
              'dosage', pr.dosage,
              'frequency', pr.frequency,
              'duration', pr.duration,
              'route', pr.route,
              'quantity', pr.quantity
            )
          ) as prescriptions,
          u.full_name as dispensed_by
        FROM prescriptions pr
        JOIN drugs d ON pr.drug_id = d.id
        LEFT JOIN prescription_payments pp ON pr.id = pp.prescription_id
        LEFT JOIN payments p ON pp.payment_id = p.id
        LEFT JOIN users u ON pr.dispensed_by = u.id
        WHERE pr.patient_id = ? AND pr.dispensed = true
        GROUP BY pr.session_id, pr.created_at, pr.dispensed_at, u.full_name
        ORDER BY pr.created_at DESC`,
        [patientId]
      );

      const prescriptions = rows.map((row: any) => ({
        ...row,
        payments: row.payments ? JSON.parse(`[${row.payments}]`) : [],
        prescriptions: row.prescriptions
          ? JSON.parse(`[${row.prescriptions}]`)
          : [],
      }));

      res.json(prescriptions);
    } catch (error) {
      console.error("Error fetching prescription history:", error);
      res.status(500).json({ error: "Failed to fetch prescription history" });
    } finally {
      connection.release();
    }
  }

  static async getPendingPrescriptions(
    req: AuthenticatedRequest,
    res: Response
  ) {
    const { patientId } = req.params;
    const connection = await pool.getConnection();

    try {
      const [rows] = await connection.execute<RowDataPacket[]>(
        `SELECT 
          p.id,
          p.created_at as createdAt,
          p.dosage,
          p.frequency,
          p.duration,
          p.route,
          p.quantity,
          d.id as drugId,
          d.name as genericName,
          d.strength,
          d.unit as form,
          d.prescription_price as salePricePerUnit
        FROM prescriptions p
        JOIN drugs d ON p.drug_id = d.id
        WHERE p.patient_id = ? 
        AND p.dispensed = false
        ORDER BY p.created_at DESC`,
        [patientId]
      );

      const prescriptions = rows.map((row: any) => ({
        id: row.id,
        createdAt: row.createdAt,
        dosage: row.dosage,
        frequency: row.frequency,
        duration: row.duration,
        route: row.route,
        quantity: row.quantity,
        drug: {
          id: row.drugId,
          genericName: row.genericName,
          strength: row.strength,
          form: row.form,
          salePricePerUnit: row.salePricePerUnit,
        },
      }));

      console.log("Sending prescriptions:", prescriptions);
      res.json(prescriptions);
    } catch (error) {
      console.error("Error fetching pending prescriptions:", error);
      res.status(500).json({ error: "Failed to fetch pending prescriptions" });
    } finally {
      connection.release();
    }
  }

  // Add other methods (getWaitingList, getPrescriptionHistory) here...
}

export const getPharmacyWaitingList = async (req: Request, res: Response) => {
  try {
    const [waitingList] = await pool.execute<RowDataPacket[]>(`
      SELECT DISTINCT
        p.id as prescriptionId,
        p.created_at,
        pat.id as patientId,
        pat.clinic_id as clinicId,
        pat.first_name as firstName,
        pat.middle_name as middleName,
        pat.last_name as lastName,
        pat.gender
      FROM prescriptions p
      JOIN patients pat ON p.patient_id = pat.id
      WHERE p.dispensed = false
      ORDER BY p.created_at ASC
    `);

    const formattedList = (waitingList as RowDataPacket[]).map((item) => ({
      id: item.prescriptionId,
      createdAt: item.created_at,
      patient: {
        clinicId: item.clinicId,
        firstName: item.firstName,
        middleName: item.middleName,
        lastName: item.lastName,
        gender: item.gender,
      },
      service: {
        id: "pharmacy",
        name: "Pharmacy",
        category: "pharmacy",
      },
    }));

    res.json(formattedList);
  } catch (error) {
    console.error("Error fetching pharmacy waiting list:", error);
    res.status(500).json({ error: "Failed to fetch pharmacy waiting list" });
  }
};
