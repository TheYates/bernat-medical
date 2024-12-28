import { Request, Response } from 'express';
import { pool } from '../db';
import { RowDataPacket } from 'mysql2';
import { AuthenticatedRequest } from '../types/auth';
import { createAuditLog } from '../services/audit.service';
import path from 'path';

export const getWaitingList = async (req: Request, res: Response) => {
  try {
    const [rows] = await pool.execute(
      `SELECT 
        lr.id,
        lr.created_at as createdAt,
        lr.status,
        p.id as 'patient.id',
        p.clinic_id as 'patient.clinicId',
        p.first_name as 'patient.firstName',
        p.middle_name as 'patient.middleName',
        p.last_name as 'patient.lastName',
        p.date_of_birth as 'patient.dateOfBirth',
        p.gender as 'patient.gender',
        s.id as 'service.id',
        s.name as 'service.name',
        s.category as 'service.category',
        s.price as 'service.price'
      FROM lab_requests lr
      JOIN patients p ON lr.patient_id = p.id
      JOIN services s ON lr.service_id = s.id
      WHERE lr.status = 'Pending'
      ORDER BY lr.created_at ASC`,
    ) as [RowDataPacket[], any];

    const formattedRows = rows.map(row => ({
      id: row.id,
      createdAt: row.createdAt,
      status: row.status,
      patient: {
        id: row['patient.id'],
        clinicId: row['patient.clinicId'],
        firstName: row['patient.firstName'],
        middleName: row['patient.middleName'],
        lastName: row['patient.lastName'],
        dateOfBirth: row['patient.dateOfBirth'],
        gender: row['patient.gender'],
      },
      service: {
        id: row['service.id'],
        name: row['service.name'],
        category: row['service.category'],
        price: row['service.price'],
      }
    }));

    res.json(formattedRows);
  } catch (error) {
    console.error('Error fetching waiting list:', error);
    res.status(500).json({ message: 'Failed to fetch waiting list' });
  }
};

export const getPatientHistory = async (req: Request, res: Response) => {
  try {
    const { patientId } = req.params;

    const [rows] = await pool.execute(
      `SELECT 
        lr.id,
        lr.created_at as createdAt,
        lr.status,
        lr.result,
        lr.file_url as fileUrl,
        s.id as 'service.id',
        s.name as 'service.name',
        s.category as 'service.category',
        s.price as 'service.price',
        u.username as 'requestedBy.username',
        u.full_name as 'requestedBy.fullName'
      FROM lab_requests lr
      JOIN services s ON lr.service_id = s.id
      JOIN users u ON lr.requested_by = u.id
      WHERE lr.patient_id = ?
      ORDER BY lr.created_at DESC`,
      [patientId]
    ) as [RowDataPacket[], any];

    const formattedRows = rows.map(row => ({
      id: row.id,
      createdAt: row.createdAt,
      status: row.status,
      result: row.result,
      fileUrl: row.fileUrl,
      service: {
        id: row['service.id'],
        name: row['service.name'],
        category: row['service.category'],
        price: row['service.price'],
      },
      requestedBy: {
        username: row['requestedBy.username'],
        fullName: row['requestedBy.fullName'],
      }
    }));

    res.json(formattedRows);
  } catch (error) {
    console.error('Error fetching patient history:', error);
    res.status(500).json({ message: 'Failed to fetch patient history' });
  }
};

export const updateResult = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { requestId } = req.params;
    const { result } = req.body;
    const fileUrl = req.file ? `/api/uploads/${req.file.filename}` : null;

    console.log('File details:', {
      file: req.file,
      fileUrl,
      fullPath: path.join(__dirname, '../uploads', req.file?.filename || '')
    });

    await pool.execute(
      `UPDATE lab_requests 
       SET result = ?, 
           file_url = ?,
           status = 'Completed',
           completed_by = ?,
           completed_at = NOW()
       WHERE id = ?`,
      [result, fileUrl, req.user?.id, requestId]
    );

    await createAuditLog({
      userId: req.user?.id || 0,
      actionType: 'update',
      entityType: 'lab_request',
      entityId: requestId,
      details: { result, fileUrl },
      ipAddress: req.ip || 'unknown'
    });

    res.json({ message: 'Result updated successfully' });
  } catch (error) {
    console.error('Error updating result:', error);
    res.status(500).json({ message: 'Failed to update result' });
  }
};

export const deleteRequest = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { requestId } = req.params;
    const { reason } = req.body;

    await pool.execute(
      `UPDATE lab_requests 
       SET status = 'Cancelled',
           cancelled_by = ?,
           cancelled_at = NOW(),
           cancel_reason = ?
       WHERE id = ? AND status = 'Pending'`,
      [req.user?.id, reason || null, requestId]
    );

    await createAuditLog({
      userId: req.user?.id || 0,
      actionType: 'delete',
      entityType: 'lab_request',
      entityId: requestId,
      details: { reason },
      ipAddress: req.ip || 'unknown'
    });

    res.json({ message: 'Request cancelled successfully' });
  } catch (error) {
    console.error('Error cancelling request:', error);
    res.status(500).json({ message: 'Failed to cancel request' });
  }
};

export const updateStatus = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { requestId } = req.params;
    const { status } = req.body;

    await pool.execute(
      `UPDATE lab_requests 
       SET status = ?,
           updated_by = ?,
           updated_at = NOW()
       WHERE id = ?`,
      [status, req.user?.id, requestId]
    );

    await createAuditLog({
      userId: req.user?.id || 0,
      actionType: 'update',
      entityType: 'lab_request',
      entityId: requestId,
      details: { status },
      ipAddress: req.ip || 'unknown'
    });

    res.json({ message: 'Status updated successfully' });
  } catch (error) {
    console.error('Error updating status:', error);
    res.status(500).json({ message: 'Failed to update status' });
  }
};

export const createRequest = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { patientId, serviceId } = req.body;
    
    console.log('Received request body:', req.body);

    // Add validation
    if (!patientId || !serviceId) {
      return res.status(400).json({ 
        message: 'Patient ID and Service ID are required',
        received: req.body,
        missing: {
          patientId: !patientId,
          serviceId: !serviceId
        }
      });
    }

    // Validate that patient exists
    const [patients] = await pool.execute(
      'SELECT id FROM patients WHERE id = ?',
      [patientId]
    ) as [RowDataPacket[], any];

    if (!patients.length) {
      return res.status(400).json({
        message: 'Invalid patient ID',
        patientId
      });
    }

    // Validate that service exists
    const [services] = await pool.execute(
      'SELECT id FROM services WHERE id = ?',
      [serviceId]
    ) as [RowDataPacket[], any];

    if (!services.length) {
      return res.status(400).json({
        message: 'Invalid service ID',
        serviceId
      });
    }

    // Add user check
    if (!req.user?.id) {
      console.log('No user ID found:', req.user); // Debug log
      return res.status(401).json({ message: 'User not authenticated' });
    }

    console.log('Creating lab request with:', { // Debug log
      patientId,
      serviceId,
      userId: req.user.id
    });

    const [result] = await pool.execute(
      `INSERT INTO lab_requests (
        patient_id,
        service_id,
        status,
        requested_by,
        created_at
      ) VALUES (?, ?, 'Pending', ?, NOW())`,
      [patientId, serviceId, req.user.id]
    );

    await createAuditLog({
      userId: req.user.id,
      actionType: 'create',
      entityType: 'lab_request',
      entityId: (result as any).insertId,
      details: { patientId, serviceId },
      ipAddress: req.ip || 'unknown'
    });

    res.status(201).json({ 
      message: 'Lab request created successfully',
      id: (result as any).insertId
    });
  } catch (error) {
    console.error('Error creating lab request:', {
      error,
      body: req.body,
      user: req.user
    });
    
    // Type check the error before accessing message property
    if (error instanceof Error) {
      res.status(500).json({ 
        message: 'Failed to create lab request',
        error: error.message
      });
    } else {
      res.status(500).json({ 
        message: 'Failed to create lab request',
        error: 'Unknown error occurred'
      });
    }
  }
};

// ... I'll continue with the other controllers in the next message 