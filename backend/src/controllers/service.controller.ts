import { Request, Response } from "express";
import { pool } from "../db";
import { RowDataPacket, ResultSetHeader } from "mysql2";
import { AuthenticatedRequest } from "../types/auth";
import { createAuditLog } from "../services/audit.service";

interface ServiceItem {
  id: number;
  name: string;
  price: number;
  priceAtTime: number;
}

export const getServices = async (req: Request, res: Response) => {
  try {
    const category = req.query.category as string;

    const query = category
      ? "SELECT * FROM services WHERE category = ?"
      : "SELECT * FROM services";

    const params = category ? [category] : [];

    console.log("Fetching services:", { category, query, params }); // Debug log

    const [services] = await pool.execute(query, params);

    res.json(services);
  } catch (error) {
    console.error("Error fetching services:", error);
    res.status(500).json({ message: "Failed to fetch services" });
  }
};

export const createServiceRequest = async (
  req: AuthenticatedRequest,
  res: Response
) => {
  console.log("Received request:", {
    url: req.url,
    method: req.method,
    body: req.body,
  });
  const connection = await pool.getConnection();

  try {
    const { patientId, services } = req.body;

    await connection.beginTransaction();

    const [result] = (await connection.execute(
      "INSERT INTO service_requests (patient_id) VALUES (?)",
      [patientId]
    )) as [ResultSetHeader, any];

    for (const serviceId of services) {
      const [serviceData] = (await connection.execute(
        "SELECT price FROM services WHERE id = ?",
        [serviceId]
      )) as [RowDataPacket[], any];

      await connection.execute(
        "INSERT INTO service_request_items (request_id, service_id, price_at_time) VALUES (?, ?, ?)",
        [result.insertId, serviceId, serviceData[0].price]
      );
    }

    await createAuditLog({
      userId: req.user?.id || 0,
      actionType: "create",
      entityType: "service_request",
      entityId: result.insertId.toString(),
      details: { patientId, services },
      ipAddress: req.ip,
    });

    await connection.commit();
    res.status(201).json({
      message: "Service request created",
      requestId: result.insertId,
    });
  } catch (error) {
    await connection.rollback();
    console.error("Error creating service request:", error);
    res.status(500).json({ message: "Server error" });
  } finally {
    connection.release();
  }
};

// Get service request history for a patient
export const getServiceRequestHistory = async (req: Request, res: Response) => {
  try {
    const { patientId } = req.params;

    const [history] = await pool.execute<RowDataPacket[]>(
      `
      SELECT 
        sr.id,
        sr.status,
        sr.created_at as createdAt,
        p.clinic_id as clinicId,
        p.first_name as firstName,
        p.middle_name as middleName,
        p.last_name as lastName,
        p.date_of_birth as dateOfBirth,
        p.gender,
        s.id as serviceId,
        s.name as serviceName,
        s.category as serviceCategory
      FROM service_requests sr
      JOIN patients p ON sr.patient_id = p.id
      JOIN service_request_items sri ON sr.id = sri.request_id
      JOIN services s ON sri.service_id = s.id
      WHERE sr.patient_id = ?
      ORDER BY sr.created_at DESC
    `,
      [patientId]
    );

    const formattedList = history.map((item) => ({
      id: item.id,
      createdAt: item.createdAt.toISOString(),
      status: item.status,
      patient: {
        clinicId: item.clinicId,
        firstName: item.firstName,
        middleName: item.middleName,
        lastName: item.lastName,
        dateOfBirth: item.dateOfBirth.toISOString(),
        gender: item.gender,
      },
      service: {
        id: item.serviceId,
        name: item.serviceName,
        category: item.serviceCategory,
      },
    }));

    res.json(formattedList);
  } catch (error) {
    console.error("Error fetching service request history:", error);
    res.status(500).json({ error: "Failed to fetch service request history" });
  }
};

// Cancel a service request
export const cancelServiceRequest = async (
  req: AuthenticatedRequest,
  res: Response
) => {
  try {
    const requestId = req.params.requestId;
    const status = req.body.status || "Cancelled";

    // First check if the request exists
    const [request] = (await pool.execute(
      "SELECT id FROM service_requests WHERE id = ?",
      [requestId]
    )) as [RowDataPacket[], any];

    if (!request.length) {
      return res.status(404).json({ message: "Service request not found" });
    }

    // Update the status
    await pool.execute("UPDATE service_requests SET status = ? WHERE id = ?", [
      status,
      requestId,
    ]);

    // Create audit log
    await createAuditLog({
      userId: req.user?.id || 0,
      actionType: "update",
      entityType: "service_request",
      entityId: requestId,
      details: { status },
      ipAddress: req.ip || "unknown",
    });

    res.json({
      message: "Service request status updated successfully",
      status: status,
    });
  } catch (error) {
    console.error("Error updating service request:", error);
    res.status(500).json({
      message: "Failed to update service request",
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
};

export const getWaitingList = async (req: Request, res: Response) => {
  try {
    // Simpler query to debug
    const [waitingList] = (await pool.execute(`
      SELECT 
        sr.id,
        sr.status,
        sr.created_at as createdAt,
        p.clinic_id as clinicId,
        p.first_name as firstName,
        p.middle_name as middleName,
        p.last_name as lastName,
        p.date_of_birth as dateOfBirth,
        p.gender,
        s.id as serviceId,
        s.name as serviceName,
        s.category as serviceCategory
      FROM service_requests sr
      JOIN patients p ON sr.patient_id = p.id
      JOIN service_request_items sri ON sr.id = sri.request_id
      JOIN services s ON sri.service_id = s.id
      WHERE sr.status IN ('Pending', 'In Progress')
      ORDER BY sr.created_at ASC
    `)) as [RowDataPacket[], any];

    // console.log('Raw waiting list:', waitingList); // Debug raw results

    // Keep the data transformation to match the interface
    const formattedList = waitingList.map((item) => ({
      id: item.id,
      createdAt: item.createdAt.toISOString(),
      status: item.status,
      patient: {
        clinicId: item.clinicId,
        firstName: item.firstName,
        middleName: item.middleName,
        lastName: item.lastName,
        dateOfBirth: item.dateOfBirth.toISOString(),
        gender: item.gender,
      },
      service: {
        id: item.serviceId,
        name: item.serviceName,
        category: item.serviceCategory,
      },
    }));

    res.json(formattedList);
  } catch (error) {
    console.error("Error fetching waiting list:", error);
    res.status(500).json({ error: "Failed to fetch waiting list" });
  }
};

export const updateServiceRequestStatus = async (
  req: Request,
  res: Response
) => {
  const { id } = req.params;
  const { status } = req.body;

  try {
    await pool.execute(
      `UPDATE service_requests 
       SET status = ?, 
           updated_at = NOW() 
       WHERE id = ?`,
      [status, id]
    );

    res.json({ message: "Service request status updated successfully" });
  } catch (error) {
    console.error("Error updating service request status:", error);
    res.status(500).json({ error: "Failed to update service request status" });
  }
};
