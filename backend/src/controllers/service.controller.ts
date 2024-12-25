import { Request, Response } from 'express';
import { pool } from '../db';
import { RowDataPacket } from 'mysql2';
import { AuthenticatedRequest } from '../types/auth';
import { createAuditLog } from '../services/audit.service';

interface ServiceItem {
  id: number;
  name: string;
  price: number;
  priceAtTime: number;
}

export const getServices = async (req: Request, res: Response) => {
  try {
    const [services] = await pool.execute(
      'SELECT * FROM services ORDER BY category, name'
    ) as [RowDataPacket[], any];

    res.json(services);
  } catch (error) {
    console.error('Error fetching services:', error);
    res.status(500).json({ message: 'Failed to fetch services' });
  }
};

export const createServiceRequest = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { patientId, services } = req.body;

    // Add debug logging
    console.log('Creating service request:', { patientId, services });

    if (!patientId || !services || !Array.isArray(services) || services.length === 0) {
      return res.status(400).json({ 
        message: 'Invalid request data. Patient ID and services are required.' 
      });
    }

    // Start transaction
    const connection = await pool.getConnection();
    await connection.beginTransaction();

    try {
      // Create service request
      const [result] = await connection.execute(
        'INSERT INTO service_requests (patient_id) VALUES (?)',
        [patientId]
      ) as [any, any];

      const requestId = result.insertId;

      // Add service items
      for (const serviceId of services) {
        const [serviceData] = await connection.execute(
          'SELECT price FROM services WHERE id = ?',
          [serviceId]
        ) as [RowDataPacket[], any];

        if (!serviceData[0]) {
          throw new Error(`Service with ID ${serviceId} not found`);
        }

        await connection.execute(
          'INSERT INTO service_request_items (request_id, service_id, price_at_time) VALUES (?, ?, ?)',
          [requestId, serviceId, serviceData[0].price]
        );
      }

      await connection.commit();

      // Create audit log
      await createAuditLog({
        userId: req.user?.id || 0,
        actionType: 'create',
        entityType: 'service_request',
        entityId: requestId.toString(),
        details: { patientId, services },
        ipAddress: req.ip || 'unknown'
      });

      res.status(201).json({ 
        message: 'Service request created successfully',
        requestId
      });
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  } catch (error) {
    console.error('Error creating service request:', error);
    res.status(500).json({ message: 'Failed to create service request' });
  }
};

// Get service request history for a patient
export const getServiceRequestHistory = async (req: Request, res: Response) => {
  try {
    const patientId = req.params.patientId;
    
    const [requests] = await pool.execute(`
      SELECT 
        sr.id, 
        sr.status, 
        sr.created_at,
        JSON_ARRAYAGG(
          JSON_OBJECT(
            'id', s.id,
            'name', s.name,
            'price', s.price,
            'priceAtTime', sri.price_at_time
          )
        ) as services
      FROM service_requests sr
      LEFT JOIN service_request_items sri ON sr.id = sri.request_id
      LEFT JOIN services s ON sri.service_id = s.id
      WHERE sr.patient_id = ?
      GROUP BY sr.id, sr.status, sr.created_at
      ORDER BY sr.created_at DESC
    `, [patientId]) as [RowDataPacket[], any];

    // Clean up the results and format dates
    const cleanedRequests = requests.map(request => ({
      ...request,
      createdAt: request.created_at.toISOString(), // Convert MySQL date to ISO string
      services: request.services.filter(Boolean).map((service: any) => ({
        ...service,
        price: Number(service.price),
        priceAtTime: Number(service.priceAtTime)
      }))
    }));

    res.json(cleanedRequests);
  } catch (error) {
    console.error('Error fetching service request history:', error);
    res.status(500).json({ message: 'Failed to fetch service request history' });
  }
};

// Cancel a service request
export const cancelServiceRequest = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const requestId = req.params.requestId;
    
    await pool.execute(
      'UPDATE service_requests SET status = ? WHERE id = ?',
      ['Cancelled', requestId]
    );

    // Create audit log
    await createAuditLog({
      userId: req.user?.id || 0,
      actionType: 'update',
      entityType: 'service_request',
      entityId: requestId,
      details: { status: 'Cancelled' },
      ipAddress: req.ip || 'unknown'
    });

    res.json({ message: 'Service request cancelled successfully' });
  } catch (error) {
    console.error('Error cancelling service request:', error);
    res.status(500).json({ message: 'Failed to cancel service request' });
  }
}; 