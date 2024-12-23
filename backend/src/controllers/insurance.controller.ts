import { Request, Response } from 'express';
import { pool } from '../db';
import type { AuthenticatedRequest } from '../types/auth';
import type { RowDataPacket, ResultSetHeader } from 'mysql2';
import { createAuditLog } from '../services/audit.service';
import { getClientIp } from '../services/request.service';

export const getInsuranceCompanies = async (req: Request, res: Response) => {
  try {
    const [companies] = await pool.execute(`
      SELECT 
        id,
        name,
        CAST(markup_decimal AS DECIMAL(4,2)) as markup_decimal,
        contact_person,
        phone,
        email,
        active,
        created_at
      FROM insurance_companies 
      ORDER BY name ASC
    `);
    
    res.json(companies);
  } catch (error) {
    console.error('Error fetching insurance companies:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

export const createInsuranceCompany = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { name, markup_decimal, contact_person, phone, email, active } = req.body;

    const [result] = await pool.execute(
      `INSERT INTO insurance_companies 
       (name, markup_decimal, contact_person, phone, email, active) 
       VALUES (?, ?, ?, ?, ?, ?)`,
      [name, markup_decimal, contact_person, phone, email, active]
    ) as [ResultSetHeader, any];

    await createAuditLog({
      userId: req.user?.id || 0,
      actionType: 'create',
      entityType: 'insurance',
      entityId: result.insertId,
      details: req.body,
      ipAddress: getClientIp(req)
    });

    res.status(201).json({ id: result.insertId, ...req.body });
  } catch (error) {
    console.error('Error creating insurance company:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

export const updateInsuranceCompany = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { name, markup_decimal, contact_person, phone, email, active } = req.body;

    await pool.execute(
      `UPDATE insurance_companies 
       SET name = ?, markup_decimal = ?, contact_person = ?, 
           phone = ?, email = ?, active = ?
       WHERE id = ?`,
      [name, markup_decimal, contact_person, phone, email, active, id]
    );

    await createAuditLog({
      userId: req.user?.id || 0,
      actionType: 'update',
      entityType: 'insurance',
      entityId: parseInt(id),
      details: req.body,
      ipAddress: getClientIp(req)
    });

    res.json({ message: 'Insurance company updated' });
  } catch (error) {
    console.error('Error updating insurance company:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

export const getDrugInsuranceMarkups = async (req: Request, res: Response) => {
  try {
    const { drugId } = req.params;
    
    const [markups] = await pool.execute(`
      SELECT 
        dim.*,
        ic.name as insurance_name,
        ic.active as insurance_active
      FROM drug_insurance_markups dim
      JOIN insurance_companies ic ON dim.insurance_id = ic.id
      WHERE dim.drug_id = ?
    `, [drugId]);

    res.json(markups);
  } catch (error) {
    console.error('Error fetching drug insurance markups:', error);
    res.status(500).json({ message: 'Server error' });
  }
}; 