import { Request, Response } from "express";
import { pool } from "../db";
import { RowDataPacket } from "mysql2";
import type { AuthenticatedRequest } from "../types/auth";

export class PharmacyController {
  static async dispensePrescriptions(req: AuthenticatedRequest, res: Response) {
    const connection = await pool.getConnection();

    try {
      await connection.beginTransaction();
      const { prescriptionIds, payments } = req.body;
      const userId = req.user?.id;

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

      // Update prescriptions
      await connection.execute(
        `UPDATE prescriptions 
         SET dispensed = true, 
             dispensed_by = ?, 
             dispensed_at = NOW()
         WHERE id IN (?)`,
        [userId, prescriptionIds.join(",")]
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

  static async getWaitingList(req: AuthenticatedRequest, res: Response) {
    const connection = await pool.getConnection();

    try {
      const [rows] = await connection.execute<RowDataPacket[]>(
        `SELECT 
          p.id,
          p.clinic_id,
          p.first_name,
          p.middle_name,
          p.last_name,
          p.date_of_birth,
          p.gender,
          p.contact,
          pr.id as prescription_id,
          pr.created_at
         FROM prescriptions pr
         JOIN patients p ON pr.patient_id = p.id
         WHERE pr.dispensed = false
         ORDER BY pr.created_at ASC`
      );

      res.json(rows);
    } catch (error) {
      console.error("Error fetching waiting list:", error);
      res.status(500).json({ error: "Failed to fetch waiting list" });
    } finally {
      connection.release();
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
          pr.id,
          pr.created_at,
          pr.dispensed,
          pr.dispensed_at,
          pr.dosage,
          pr.frequency,
          pr.duration,
          pr.quantity,
          u.full_name as dispensed_by,
          GROUP_CONCAT(DISTINCT p.method) as payment_methods,
          SUM(p.amount) as total_amount,
          d.id as drug_id,
          d.name as drug_name,
          d.strength as drug_strength,
          d.unit as drug_form
         FROM prescriptions pr
         JOIN drugs d ON pr.drug_id = d.id
         LEFT JOIN prescription_payments pp ON pr.id = pp.prescription_id
         LEFT JOIN payments p ON pp.payment_id = p.id
         LEFT JOIN users u ON pr.dispensed_by = u.id
         WHERE pr.patient_id = ?
         AND pr.dispensed = true
         GROUP BY pr.id, pr.created_at, pr.dispensed, pr.dispensed_at,
                  pr.dosage, pr.frequency, pr.duration, pr.quantity,
                  u.full_name, d.id, d.name, d.strength, d.unit
         ORDER BY pr.created_at DESC`,
        [patientId]
      );

      const prescriptions = rows.map((row: any) => ({
        ...row,
        drug: {
          id: row.drug_id,
          genericName: row.drug_name,
          strength: row.drug_strength,
          form: row.drug_form,
        },
        payment_methods: row.payment_methods
          ? row.payment_methods.split(",")
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

  // Add other methods (getWaitingList, getPrescriptionHistory) here...
}
