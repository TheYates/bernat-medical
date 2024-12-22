import type { Request, Response } from 'express';
import { pool } from '../db';
import type { ResultSetHeader, RowDataPacket } from 'mysql2';
import { createAuditLog, getClientIp } from '../services/audit.service';

interface AuthenticatedRequest extends Request {
  user?: {
    id: number;
    role: string;
  };
}

interface RestockData {
  purchaseQuantity: number;
  saleQuantity: number;
  batchNumber: string;
  expiryDate: string;
  notes?: string;
}

interface DrugData {
  name: string;
  category: string;
  strength: string;
  unit: string;
  minStock: number;
  expiryDate: string;
  purchaseFormId: number;
  purchasePrice: number;
  saleFormId: number;
  unitsPerPurchase: number;
  posMarkup: number;
  prescriptionMarkup: number;
}

export const getDrugs = async (req: Request, res: Response) => {
  try {
    const [drugs] = await pool.execute(`
      SELECT 
        d.id,
        d.name,
        dc.name as category,
        pf.name as purchaseForm,
        sf.name as saleForm,
        d.purchase_price as purchasePrice,
        d.units_per_purchase as unitsPerPurchase,
        d.pos_markup as posMarkup,
        d.prescription_markup as prescriptionMarkup,
        d.unit_cost as unitCost,
        d.pos_price as posPrice,
        d.prescription_price as prescriptionPrice,
        d.strength,
        d.unit,
        d.stock,
        d.min_stock as minStock,
        d.expiry_date as expiryDate,
        d.active
      FROM drugs d
      JOIN drug_categories dc ON d.category_id = dc.id
      JOIN drug_forms pf ON d.purchase_form_id = pf.id
      JOIN drug_forms sf ON d.sale_form_id = sf.id
      ORDER BY d.name ASC
    `) as [RowDataPacket[], any];

    // Format the response to include unit information
    const formattedDrugs = drugs.map(drug => ({
      ...drug,
      // Add purchase unit info
      purchase: {
        form: drug.purchaseForm,
        price: drug.purchasePrice,
        unitsPerPurchase: drug.unitsPerPurchase
      },
      // Add sale unit info
      sale: {
        form: drug.saleForm,
        posPrice: drug.posPrice,
        prescriptionPrice: drug.prescriptionPrice,
        stock: drug.stock,
        minStock: drug.minStock
      },
      // Add pricing info
      pricing: {
        unitCost: drug.unitCost,
        posMarkup: drug.posMarkup,
        prescriptionMarkup: drug.prescriptionMarkup
      }
    }));

    res.json(formattedDrugs);
  } catch (error) {
    console.error('Error fetching drugs:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

export const createDrug = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const data = req.body as DrugData;
    
    // Calculate unit cost and sale prices
    const unitCost = data.purchasePrice / data.unitsPerPurchase;
    const posPrice = unitCost * (1 + data.posMarkup);
    const prescriptionPrice = unitCost * (1 + data.prescriptionMarkup);

    // Get category_id
    const [categories] = await pool.execute(
      'SELECT id FROM drug_categories WHERE name = ?',
      [data.category]
    ) as [RowDataPacket[], any];

    if (!categories.length) {
      return res.status(400).json({ message: 'Invalid category' });
    }

    const [result] = await pool.execute(
      `INSERT INTO drugs (
        name, category_id, purchase_form_id, sale_form_id,
        purchase_price, units_per_purchase, pos_markup, 
        prescription_markup, unit_cost, pos_price, 
        prescription_price, strength, unit, min_stock, 
        expiry_date, stock
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0)`,
      [
        data.name,
        categories[0].id,
        data.purchaseFormId,
        data.saleFormId,
        data.purchasePrice,
        data.unitsPerPurchase,
        data.posMarkup,
        data.prescriptionMarkup,
        unitCost,
        posPrice,
        prescriptionPrice,
        data.strength,
        data.unit,
        data.minStock,
        data.expiryDate,
        // Initial stock is 0
      ]
    );

    const insertResult = result as ResultSetHeader;

    await createAuditLog({
      userId: req.user?.id || 0,
      actionType: 'create',
      entityType: 'drug',
      entityId: insertResult.insertId,
      details: { 
        ...data, 
        unitCost, 
        posPrice, 
        prescriptionPrice 
      },
      ipAddress: getClientIp(req)
    });

    res.status(201).json({
      id: insertResult.insertId,
      ...data,
      unitCost,
      posPrice,
      prescriptionPrice
    });
  } catch (error) {
    console.error('Error creating drug:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

export const getLowStock = async (req: Request, res: Response) => {
  try {
    const [drugs] = await pool.execute(`
      SELECT 
        d.id,
        d.name,
        dc.name as category,
        df.name as form,
        d.strength,
        d.unit,
        d.stock,
        d.min_stock as minStock
      FROM drugs d
      JOIN drug_categories dc ON d.category_id = dc.id
      JOIN drug_forms df ON d.form_id = df.id
      WHERE d.stock <= d.min_stock AND d.active = true
      ORDER BY d.stock ASC
    `) as [RowDataPacket[], any];

    res.json(drugs);
  } catch (error) {
    console.error('Error fetching low stock drugs:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

export const getExpiring = async (req: Request, res: Response) => {
  try {
    const [drugs] = await pool.execute(`
      SELECT 
        d.id,
        d.name,
        dc.name as category,
        df.name as form,
        d.strength,
        d.unit,
        d.stock,
        d.expiry_date as expiryDate
      FROM drugs d
      JOIN drug_categories dc ON d.category_id = dc.id
      JOIN drug_forms df ON d.form_id = df.id
      WHERE d.expiry_date <= DATE_ADD(CURDATE(), INTERVAL 3 MONTH)
        AND d.stock > 0
        AND d.active = true
      ORDER BY d.expiry_date ASC
    `) as [RowDataPacket[], any];

    res.json(drugs);
  } catch (error) {
    console.error('Error fetching expiring drugs:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

export const restockDrug = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { purchaseQuantity, saleQuantity, batchNumber, expiryDate, notes } = req.body as RestockData;

    // Start a transaction
    const connection = await pool.getConnection();
    await connection.beginTransaction();

    try {
      // Add stock transaction
      const [result] = await connection.execute(
        `INSERT INTO stock_transactions (
          drug_id, type, purchase_quantity, sale_quantity, 
          batch_number, expiry_date, notes, created_by
        ) VALUES (?, 'in', ?, ?, ?, ?, ?, ?)`,
        [id, purchaseQuantity, saleQuantity, batchNumber, expiryDate, notes, req.user?.id]
      );

      // Update drug stock (we'll track stock in sale units)
      await connection.execute(
        'UPDATE drugs SET stock = stock + ? WHERE id = ?',
        [saleQuantity, id]
      );

      await connection.commit();

      await createAuditLog({
        userId: req.user?.id || 0,
        actionType: 'create',
        entityType: 'stock',
        entityId: (result as ResultSetHeader).insertId,
        details: { 
          drugId: id, 
          purchaseQuantity,
          saleQuantity,
          batchNumber,
          expiryDate,
          notes 
        },
        ipAddress: getClientIp(req)
      });

      res.json({ message: 'Stock added successfully' });
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  } catch (error) {
    console.error('Error restocking drug:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Categories
export const getCategories = async (req: Request, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const offset = (page - 1) * limit;

    const [categories] = await pool.execute(
      'SELECT * FROM drug_categories ORDER BY name ASC LIMIT ? OFFSET ?',
      [limit, offset]
    ) as [RowDataPacket[], any];

    const [total] = await pool.execute(
      'SELECT COUNT(*) as count FROM drug_categories'
    ) as [RowDataPacket[], any];

    res.json({
      data: categories,
      page,
      totalPages: Math.ceil(total[0].count / limit),
      hasMore: offset + categories.length < total[0].count
    });
  } catch (error) {
    console.error('Error fetching categories:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

export const createCategory = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { name, description } = req.body;

    // Check if category exists
    const [existing] = await pool.execute(
      'SELECT id FROM drug_categories WHERE name = ?',
      [name]
    ) as [RowDataPacket[], any];

    if (existing.length > 0) {
      return res.status(400).json({ message: 'Category already exists' });
    }

    const [result] = await pool.execute(
      'INSERT INTO drug_categories (name, description) VALUES (?, ?)',
      [name, description]
    );

    const insertResult = result as ResultSetHeader;

    await createAuditLog({
      userId: req.user?.id || 0,
      actionType: 'create',
      entityType: 'drug',
      entityId: insertResult.insertId,
      details: req.body,
      ipAddress: getClientIp(req)
    });

    res.status(201).json({
      id: insertResult.insertId,
      name,
      description
    });
  } catch (error) {
    console.error('Error creating category:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

export const deleteCategory = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;

    // Check if category is in use
    const [drugs] = await pool.execute(
      'SELECT COUNT(*) as count FROM drugs WHERE category_id = ?',
      [id]
    ) as [RowDataPacket[], any];

    if (drugs[0].count > 0) {
      return res.status(400).json({ 
        message: 'Cannot delete category that is in use by drugs' 
      });
    }

    const [result] = await pool.execute(
      'DELETE FROM drug_categories WHERE id = ?',
      [id]
    );

    const deleteResult = result as ResultSetHeader;
    if (deleteResult.affectedRows === 0) {
      return res.status(404).json({ message: 'Category not found' });
    }

    await createAuditLog({
      userId: req.user?.id || 0,
      actionType: 'delete',
      entityType: 'drug',
      entityId: id,
      ipAddress: getClientIp(req)
    });

    res.json({ message: 'Category deleted successfully' });
  } catch (error) {
    console.error('Error deleting category:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Forms
export const getForms = async (req: Request, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const offset = (page - 1) * limit;

    const [forms] = await pool.execute(
      'SELECT * FROM drug_forms ORDER BY name ASC LIMIT ? OFFSET ?',
      [limit, offset]
    ) as [RowDataPacket[], any];

    const [total] = await pool.execute(
      'SELECT COUNT(*) as count FROM drug_forms'
    ) as [RowDataPacket[], any];

    res.json({
      data: forms,
      page,
      totalPages: Math.ceil(total[0].count / limit),
      hasMore: offset + forms.length < total[0].count
    });
  } catch (error) {
    console.error('Error fetching forms:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

export const createForm = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { name, description } = req.body;

    // Check if form exists
    const [existing] = await pool.execute(
      'SELECT id FROM drug_forms WHERE name = ?',
      [name]
    ) as [RowDataPacket[], any];

    if (existing.length > 0) {
      return res.status(400).json({ message: 'Form already exists' });
    }

    const [result] = await pool.execute(
      'INSERT INTO drug_forms (name, description) VALUES (?, ?)',
      [name, description]
    );

    const insertResult = result as ResultSetHeader;

    await createAuditLog({
      userId: req.user?.id || 0,
      actionType: 'create',
      entityType: 'drug',
      entityId: insertResult.insertId,
      details: req.body,
      ipAddress: getClientIp(req)
    });

    res.status(201).json({
      id: insertResult.insertId,
      name,
      description
    });
  } catch (error) {
    console.error('Error creating form:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

export const deleteForm = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;

    // Check if form is in use
    const [drugs] = await pool.execute(
      'SELECT COUNT(*) as count FROM drugs WHERE form_id = ?',
      [id]
    ) as [RowDataPacket[], any];

    if (drugs[0].count > 0) {
      return res.status(400).json({ 
        message: 'Cannot delete form that is in use by drugs' 
      });
    }

    const [result] = await pool.execute(
      'DELETE FROM drug_forms WHERE id = ?',
      [id]
    );

    const deleteResult = result as ResultSetHeader;
    if (deleteResult.affectedRows === 0) {
      return res.status(404).json({ message: 'Form not found' });
    }

    await createAuditLog({
      userId: req.user?.id || 0,
      actionType: 'delete',
      entityType: 'drug',
      entityId: id,
      ipAddress: getClientIp(req)
    });

    res.json({ message: 'Form deleted successfully' });
  } catch (error) {
    console.error('Error deleting form:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

export const updateDrug = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const data = req.body as DrugData;
    
    // Calculate unit cost and sale prices
    const unitCost = data.purchasePrice / data.unitsPerPurchase;
    const posPrice = unitCost * (1 + data.posMarkup);
    const prescriptionPrice = unitCost * (1 + data.prescriptionMarkup);

    // Get category_id
    const [categories] = await pool.execute(
      'SELECT id FROM drug_categories WHERE name = ?',
      [data.category]
    ) as [RowDataPacket[], any];

    if (!categories.length) {
      return res.status(400).json({ message: 'Invalid category' });
    }

    const [result] = await pool.execute(
      `UPDATE drugs SET
        name = ?, category_id = ?, purchase_form_id = ?, sale_form_id = ?,
        purchase_price = ?, units_per_purchase = ?, pos_markup = ?, 
        prescription_markup = ?, unit_cost = ?, pos_price = ?, 
        prescription_price = ?, strength = ?, unit = ?, min_stock = ?, 
        expiry_date = ?
      WHERE id = ?`,
      [
        data.name,
        categories[0].id,
        data.purchaseFormId,
        data.saleFormId,
        data.purchasePrice,
        data.unitsPerPurchase,
        data.posMarkup,
        data.prescriptionMarkup,
        unitCost,
        posPrice,
        prescriptionPrice,
        data.strength,
        data.unit,
        data.minStock,
        data.expiryDate,
        id
      ]
    );

    await createAuditLog({
      userId: req.user?.id || 0,
      actionType: 'update',
      entityType: 'drug',
      entityId: id,
      details: { ...data, unitCost, posPrice, prescriptionPrice },
      ipAddress: getClientIp(req)
    });

    res.json({ message: 'Drug updated successfully' });
  } catch (error) {
    console.error('Error updating drug:', error);
    res.status(500).json({ message: 'Server error' });
  }
}; 