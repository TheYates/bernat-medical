import { Request, Response } from "express";
import { pool } from "../db";
import { ResultSetHeader } from "mysql2";
import { AuthenticatedRequest } from "../types/auth";

export const createSale = async (req: AuthenticatedRequest, res: Response) => {
  const connection = await pool.getConnection();
  const userId = req.user?.id;

  try {
    await connection.beginTransaction();
    const { items, payments } = req.body;

    // Create sale record
    const [saleResult] = await connection.execute<ResultSetHeader>(
      `INSERT INTO sales (total_amount, created_by) 
       VALUES (?, ?)`,
      [
        items.reduce(
          (sum: number, item: any) => sum + item.quantity * item.pricePerUnit,
          0
        ),
        userId,
      ]
    );
    const saleId = saleResult.insertId;

    // Insert sale items
    for (const item of items) {
      await connection.execute(
        `INSERT INTO sale_items (sale_id, drug_id, quantity, price_per_unit) 
         VALUES (?, ?, ?, ?)`,
        [saleId, item.drugId, item.quantity, item.pricePerUnit]
      );

      // Update drug stock
      await connection.execute(
        `UPDATE drugs SET stock = stock - ? WHERE id = ?`,
        [item.quantity, item.drugId]
      );
    }

    // Record payments in sale_payments table
    for (const [method, amount] of Object.entries(payments)) {
      await connection.execute(
        `INSERT INTO sale_payments (sale_id, payment_method, amount) 
         VALUES (?, ?, ?)`,
        [saleId, method, amount]
      );
    }

    await connection.commit();
    res.status(201).json({ id: saleId });
  } catch (error) {
    await connection.rollback();
    console.error("Error creating sale:", error);
    res.status(500).json({ message: "Failed to create sale" });
  } finally {
    connection.release();
  }
};
