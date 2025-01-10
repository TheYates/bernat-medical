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
    for (const payment of payments) {
      await connection.execute(
        `INSERT INTO sale_payments (sale_id, payment_method, amount) 
         VALUES (?, ?, ?)`,
        [saleId, payment.payment_method, payment.amount]
      );
    }

    await connection.commit();
    res.status(201).json({ id: saleId });
  } catch (error) {
    await connection.rollback();
    console.error("Error creating sale:", error);
    res.status(500).json({
      message: "Failed to create sale",
      error: error instanceof Error ? error.message : String(error),
    });
  } finally {
    connection.release();
  }
};

export const getSales = async (req: AuthenticatedRequest, res: Response) => {
  const connection = await pool.getConnection();

  try {
    const [sales] = await connection.execute(`
      SELECT 
        s.id, 
        s.total_amount, 
        s.created_at,
        u.full_name as created_by
      FROM sales s
      LEFT JOIN users u ON s.created_by = u.id
      ORDER BY s.created_at DESC
      LIMIT 100
    `);

    // For each sale, get its items and payments
    const salesWithDetails = await Promise.all(
      (sales as any[]).map(async (sale) => {
        const [items] = await connection.execute(
          `
          SELECT 
            si.*,
            d.name,
            d.strength,
            d.unit
          FROM sale_items si
          LEFT JOIN drugs d ON si.drug_id = d.id
          WHERE si.sale_id = ?
        `,
          [sale.id]
        );

        const [payments] = await connection.execute(
          `
          SELECT payment_method, amount
          FROM sale_payments
          WHERE sale_id = ?
        `,
          [sale.id]
        );

        return {
          ...sale,
          items,
          payments,
        };
      })
    );

    res.json(salesWithDetails);
  } catch (error) {
    console.error("Error fetching sales:", error);
    res.status(500).json({ message: "Failed to fetch sales" });
  } finally {
    connection.release();
  }
};

export const getTodaysSummary = async (
  req: AuthenticatedRequest,
  res: Response
) => {
  const connection = await pool.getConnection();

  try {
    // Get total sales and transactions for today
    const [totals] = await connection.execute<any[]>(`
      SELECT 
        COUNT(DISTINCT s.id) as totalTransactions,
        COALESCE(SUM(s.total_amount), 0) as totalSales
      FROM sales s
      WHERE DATE(s.created_at) = CURDATE()
    `);

    // Get payment method totals for today
    const [payments] = await connection.execute<any[]>(`
      SELECT 
        sp.payment_method as method,
        COALESCE(SUM(sp.amount), 0) as total
      FROM sale_payments sp
      JOIN sales s ON s.id = sp.sale_id
      WHERE DATE(s.created_at) = CURDATE()
      GROUP BY sp.payment_method
    `);

    res.json({
      totalTransactions: totals[0]?.totalTransactions || 0,
      totalSales: totals[0]?.totalSales || 0,
      paymentMethods: payments || [],
    });
  } catch (error) {
    console.error("Error fetching today's summary:", error);
    res.status(500).json({ message: "Failed to fetch today's summary" });
  } finally {
    connection.release();
  }
};
