import { Request, Response } from "express";
import { pool } from "../db";
import { AuthenticatedRequest } from "../types/auth";
import { createAuditLog } from "../services/audit.service";
import { RowDataPacket, ResultSetHeader } from "mysql2";

export const getPendingPayments = async (req: Request, res: Response) => {
  try {
    const { patientId } = req.params;
    console.log("Fetching pending payments for patient:", patientId);

    const [payments] = await pool.execute<RowDataPacket[]>(
      `
      (
        -- Service Requests
        SELECT 
          sr.id,
          'service_request' as request_type,
          s.name as service,
          s.price as amount,
          sr.status,
          sr.created_at as createdAt
        FROM service_requests sr
        JOIN service_request_items sri ON sr.id = sri.request_id
        JOIN services s ON sri.service_id = s.id
        WHERE sr.patient_id = ?
        AND sr.status = 'Completed'
        AND sr.payment_status = 'Pending'
        AND sri.payment_status = 'Pending'
      )
      UNION ALL
      (
        -- Lab Requests
        SELECT 
          lr.id,
          'lab_request' as request_type,
          s.name as service,
          s.price as amount,
          lr.status,
          lr.created_at as createdAt
        FROM lab_requests lr
        JOIN services s ON lr.service_id = s.id
        WHERE lr.patient_id = ?
        AND lr.status = 'Completed'
        AND lr.payment_status = 'Pending'
      )
      ORDER BY createdAt DESC
    `,
      [patientId, patientId]
    );

    // console.log("Pending payments:", payments);
    res.json(payments);
  } catch (error) {
    console.error("Error fetching pending payments:", error);
    res.status(500).json({ error: "Failed to fetch pending payments" });
  }
};

export const getPaymentHistory = async (req: Request, res: Response) => {
  try {
    const patientId = Number(req.params.patientId);
    const page = Number(req.query.page) || 1;
    const limit = 5;
    const offset = (page - 1) * limit;

    // First get the data without pagination to get total count
    const [allPayments] = await pool.execute<RowDataPacket[]>(
      `
      (
        SELECT 
          sr.id,
          s.name as service,
          SUM(p.amount) as amount,
          GROUP_CONCAT(
            CONCAT(p.method, ': GH₵', FORMAT(p.amount, 2))
          ) as payment_methods,
          MAX(p.status) as status,
          MAX(p.recorded_at) as createdAt,
          MAX(u.full_name) as processedBy
        FROM service_requests sr
        JOIN service_request_payments srp ON sr.id = srp.request_id
        JOIN payments p ON srp.payment_id = p.id
        JOIN service_request_items sri ON sr.id = sri.request_id
        JOIN services s ON sri.service_id = s.id
        LEFT JOIN users u ON p.recorded_by = u.id
        WHERE sr.patient_id = ? AND sr.payment_status = 'Paid'
        GROUP BY sr.id, s.name

        UNION ALL

        SELECT 
          lr.id,
          s.name as service,
          SUM(p.amount) as amount,
          GROUP_CONCAT(
            CONCAT(p.method, ': GH₵', FORMAT(p.amount, 2))
          ) as payment_methods,
          MAX(p.status) as status,
          MAX(p.recorded_at) as createdAt,
          MAX(u.full_name) as processedBy
        FROM lab_requests lr
        JOIN lab_test_payments ltp ON lr.id = ltp.test_id
        JOIN payments p ON ltp.payment_id = p.id
        JOIN services s ON lr.service_id = s.id
        LEFT JOIN users u ON p.recorded_by = u.id
        WHERE lr.patient_id = ? AND lr.payment_status = 'Paid'
        GROUP BY lr.id, s.name
      )
      ORDER BY createdAt DESC
      `,
      [patientId, patientId]
    );

    // Calculate pagination
    const totalItems = allPayments.length;
    const totalPages = Math.ceil(totalItems / limit);
    const paginatedPayments = allPayments.slice(offset, offset + limit);

    res.json({
      items: paginatedPayments,
      meta: {
        page,
        limit,
        totalItems,
        totalPages,
      },
    });
  } catch (error) {
    console.error("Error fetching payment history:", error);
    res.status(500).json({ error: "Failed to fetch payment history" });
  }
};

export const processPayment = async (
  req: AuthenticatedRequest,
  res: Response
) => {
  const connection = await pool.getConnection();

  try {
    // Validate required fields
    const { id } = req.params;
    const { methods, amounts, requestType } = req.body;

    if (!id || !methods || !amounts || !requestType) {
      return res.status(400).json({
        error: "Missing required fields",
        details: {
          id: !id ? "Request ID is required" : null,
          methods: !methods ? "Payment methods are required" : null,
          amounts: !amounts ? "Payment amounts are required" : null,
          requestType: !requestType ? "Request type is required" : null,
        },
      });
    }

    // Validate request type
    if (!["service_request", "lab_request"].includes(requestType)) {
      return res.status(400).json({
        error:
          "Invalid request type. Must be 'service_request' or 'lab_request'",
      });
    }

    // Validate user
    if (!req.user?.id) {
      return res.status(401).json({
        error: "User ID is required for payment processing",
      });
    }

    await connection.beginTransaction();

    // Create payment records for each method
    const paymentIds = [];
    for (const method of methods) {
      const amount = amounts[method];

      // Validate amount
      if (!amount || isNaN(Number(amount))) {
        await connection.rollback();
        return res.status(400).json({
          error: `Invalid amount for payment method: ${method}`,
        });
      }

      const [result] = await connection.execute<ResultSetHeader>(
        `INSERT INTO payments (method, amount, status, recorded_by) 
         VALUES (?, ?, ?, ?)`,
        [method.toLowerCase(), Number(amount), "completed", req.user.id]
      );
      paymentIds.push(result.insertId);
    }

    if (requestType === "service_request") {
      // Check if service request exists
      const [serviceRequest] = await connection.execute<RowDataPacket[]>(
        "SELECT id FROM service_requests WHERE id = ?",
        [id]
      );

      if (!serviceRequest.length) {
        await connection.rollback();
        return res.status(404).json({ error: "Service request not found" });
      }

      // Update service request status
      await connection.execute(
        `UPDATE service_requests 
         SET payment_status = 'Paid',
             paid_at = NOW(),
             paid_by = ?
         WHERE id = ?`,
        [req.user.id, id]
      );

      // Update service request items
      await connection.execute(
        `UPDATE service_request_items 
         SET payment_status = 'Paid',
             paid_at = NOW(),
             paid_by = ?
         WHERE request_id = ?`,
        [req.user.id, id]
      );

      // Create payment links for each payment
      for (const paymentId of paymentIds) {
        await connection.execute(
          `INSERT INTO service_request_payments (request_id, payment_id)
           VALUES (?, ?)`,
          [id, paymentId]
        );
      }
    } else if (requestType === "lab_request") {
      // Check if lab request exists
      const [labRequest] = await connection.execute<RowDataPacket[]>(
        "SELECT id FROM lab_requests WHERE id = ?",
        [id]
      );

      if (!labRequest.length) {
        await connection.rollback();
        return res.status(404).json({ error: "Lab request not found" });
      }

      // Update lab request status
      await connection.execute(
        `UPDATE lab_requests 
         SET payment_status = 'Paid',
             paid_at = NOW(),
             paid_by = ?
         WHERE id = ?`,
        [req.user.id, id]
      );

      // Create payment links for each payment
      for (const paymentId of paymentIds) {
        await connection.execute(
          `INSERT INTO lab_test_payments (test_id, payment_id)
           VALUES (?, ?)`,
          [id, paymentId]
        );
      }
    }

    // Create audit log
    await createAuditLog({
      userId: req.user.id,
      actionType: "create",
      entityType: "payment",
      entityId: paymentIds.join(","),
      details: JSON.stringify({
        requestType,
        amounts,
        methods,
        requestId: id,
      }),
    });

    await connection.commit();
    res.json({
      success: true,
      ids: paymentIds,
      status: "Completed",
    });
  } catch (error) {
    await connection.rollback();
    console.error("Error processing payment:", error);
    res.status(500).json({
      error: "Failed to process payment",
      details: error instanceof Error ? error.message : "Unknown error",
    });
  } finally {
    connection.release();
  }
};

export const getWaitingList = async (req: Request, res: Response) => {
  try {
    const [waitingList] = await pool.execute<RowDataPacket[]>(
      `
      (
        -- Service Requests
        SELECT DISTINCT
          p.id,
          p.clinic_id as clinicId,
          p.first_name as firstName,
          p.last_name as lastName,
          GROUP_CONCAT(s.name) as service,
          MIN(sr.created_at) as createdAt,
          SUM(s.price) as amount
        FROM patients p
        JOIN service_requests sr ON p.id = sr.patient_id
        JOIN service_request_items sri ON sr.id = sri.request_id
        JOIN services s ON sri.service_id = s.id
        WHERE sr.status = 'Completed'
        AND sr.payment_status = 'Pending'
        GROUP BY p.id
      )
      UNION ALL
      (
        -- Lab Requests
        SELECT DISTINCT
          p.id,
          p.clinic_id as clinicId,
          p.first_name as firstName,
          p.last_name as lastName,
          s.name as service,
          lr.created_at as createdAt,
          s.price as amount
        FROM patients p
        JOIN lab_requests lr ON p.id = lr.patient_id
        JOIN services s ON lr.service_id = s.id
        WHERE lr.status = 'Completed'
        AND lr.payment_status = 'Pending'
      )
      ORDER BY createdAt ASC
      LIMIT 50
      `
    );

    res.json(waitingList);
  } catch (error) {
    console.error("Error fetching waiting list:", error);
    res.status(500).json({ error: "Failed to fetch waiting list" });
  }
};
