import { Response } from 'express';
import { pool } from '../db';
import { ResultSetHeader, RowDataPacket } from 'mysql2';
import { AuthenticatedRequest } from '../types/auth';
import { createAuditLog } from '../services/audit.service';

export const getXrayRequestHistory = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const [requests] = await pool.execute<RowDataPacket[]>(
      `SELECT 
        sr.id, sr.patient_id, sr.status, sr.result, sr.file_url,
        DATE_FORMAT(sr.created_at, '%Y-%m-%dT%H:%i:%s.000Z') as createdAt,
        JSON_OBJECT(
          'id', s.id,
          'name', s.name,
          'category', s.category,
          'price', s.price
        ) as service,
        JSON_OBJECT(
          'username', u.username,
          'fullName', u.full_name
        ) as requestedBy,
        JSON_OBJECT(
          'fullName', p.full_name
        ) as performedBy
      FROM service_requests sr
      JOIN service_request_items sri ON sr.id = sri.request_id
      JOIN services s ON sri.service_id = s.id
      JOIN users u ON sr.requested_by = u.id
      LEFT JOIN users p ON sr.performed_by = p.id
      WHERE sr.patient_id = ? AND s.category = 'radiology'
      ORDER BY sr.created_at DESC`,
      [req.params.patientId]
    );

    res.json(requests);
  } catch (error) {
    console.error('Error fetching xray request history:', error);
    res.status(500).json({ message: 'Failed to fetch history' });
  }
};

export const getWaitingList = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const [requests] = await pool.execute<RowDataPacket[]>(
      `SELECT 
        sr.id,
        sr.patient_id,
        sr.status,
        DATE_FORMAT(sr.created_at, '%Y-%m-%dT%H:%i:%s.000Z') as createdAt,
        JSON_OBJECT(
          'id', p.id,
          'clinicId', p.clinic_id,
          'firstName', p.first_name,
          'middleName', p.middle_name,
          'lastName', p.last_name,
          'dateOfBirth', p.date_of_birth,
          'gender', p.gender
        ) as patient,
        JSON_OBJECT(
          'id', s.id,
          'name', s.name,
          'category', s.category,
          'price', s.price
        ) as service
      FROM service_requests sr
      JOIN patients p ON sr.patient_id = p.id
      JOIN service_request_items sri ON sr.id = sri.request_id
      JOIN services s ON sri.service_id = s.id
      WHERE sr.status = 'pending' AND s.category = 'radiology'
      ORDER BY sr.created_at ASC`
    );

    res.json(requests);
  } catch (error) {
    console.error('Error fetching waiting list:', error);
    res.status(500).json({ message: 'Failed to fetch waiting list' });
  }
};

export const updateResult = async (req: AuthenticatedRequest, res: Response) => {
  const connection = await pool.getConnection();
  
  try {
    await connection.beginTransaction();

    const { result } = req.body;
    const fileUrl = req.file ? `/uploads/${req.file.filename}` : null;

    await connection.execute(
      `UPDATE service_requests 
       SET result = ?, 
           file_url = ?,
           status = 'Completed',
           performed_by = ?,
           performed_at = CURRENT_TIMESTAMP
       WHERE id = ?`,
      [result, fileUrl, req.user?.id, req.params.requestId]
    );

    await createAuditLog({
      userId: req.user?.id as number,
      actionType: 'update',
      entityType: 'xray_request',
      entityId: parseInt(req.params.requestId),
      details: `Updated xray result`,
      ipAddress: req.ip
    });

    await connection.commit();
    res.json({ message: 'Result updated successfully' });
  } catch (error) {
    await connection.rollback();
    console.error('Error updating result:', error);
    res.status(500).json({ message: 'Failed to update result' });
  } finally {
    connection.release();
  }
};

export const deleteXrayRequest = async (req: AuthenticatedRequest, res: Response) => {
  const connection = await pool.getConnection();
  
  try {
    await connection.beginTransaction();

    const { reason } = req.body;

    await connection.execute(
      `UPDATE service_requests 
       SET status = 'Cancelled',
           cancel_reason = ?,
           cancelled_by = ?,
           cancelled_at = CURRENT_TIMESTAMP
       WHERE id = ?`,
      [reason, req.user?.id, req.params.requestId]
    );

    await createAuditLog({
      userId: req.user?.id as number,
      actionType: 'delete',
      entityType: 'xray_request',
      entityId: parseInt(req.params.requestId),
      details: `Cancelled xray request. Reason: ${reason || 'No reason provided'}`,
      ipAddress: req.ip
    });

    await connection.commit();
    res.json({ message: 'Request cancelled successfully' });
  } catch (error) {
    await connection.rollback();
    console.error('Error cancelling request:', error);
    res.status(500).json({ message: 'Failed to cancel request' });
  } finally {
    connection.release();
  }
}; 