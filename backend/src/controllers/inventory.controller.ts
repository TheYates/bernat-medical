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

interface VendorData {
  name: string;
  contactPerson?: string;
  phone?: string;
  email?: string;
  address?: string;
}

export const getDrugs = async (req: Request, res: Response): Promise<void> => {
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

export const createDrug = async (
  req: AuthenticatedRequest, 
  res: Response
): Promise<void | Response> => {
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
    return res.status(500).json({ message: 'Server error' });
  }
};

export const getLowStock = async (req: Request, res: Response): Promise<void> => {
  try {
    console.log('getLowStock endpoint hit');

    const [drugs] = await pool.execute(`
      SELECT 
        d.id,
        d.name,
        dc.name as category,
        sf.name as form,
        d.strength,
        d.unit,
        d.stock,
        d.min_stock as minStock
      FROM drugs d
      JOIN drug_categories dc ON d.category_id = dc.id
      JOIN drug_forms sf ON d.sale_form_id = sf.id
      WHERE d.stock <= d.min_stock 
        AND d.active = true
      ORDER BY d.stock ASC
    `) as [RowDataPacket[], any];

    console.log('Found low stock drugs:', drugs);

    res.json(drugs);
  } catch (error) {
    console.error('Error in getLowStock:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

export const getExpiring = async (req: Request, res: Response): Promise<void> => {
  try {
    console.log('Fetching expiring drugs...');

    const [drugs] = await pool.execute(`
      SELECT 
        d.id,
        d.name,
        dc.name as category,
        sf.name as form,
        d.strength,
        d.unit,
        d.stock,
        d.expiry_date as expiryDate
      FROM drugs d
      JOIN drug_categories dc ON d.category_id = dc.id
      JOIN drug_forms sf ON d.sale_form_id = sf.id
      WHERE d.expiry_date <= DATE_ADD(CURDATE(), INTERVAL 3 MONTH)
        AND d.stock > 0
        AND d.active = true
      ORDER BY d.expiry_date ASC
    `) as [RowDataPacket[], any];

    console.log('Found drugs:', drugs);

    res.json(drugs);
  } catch (error) {
    console.error('Error in getExpiring:', error);
    res.status(500).json({ 
      message: 'Server error', 
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

export const restockDrug = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const connection = await pool.getConnection();
  try {
    const { id } = req.params;
    const { 
      purchaseQuantity, 
      saleQuantity, 
      vendorId,
      batchNumber, 
      expiryDate, 
      notes 
    } = req.body;

    await connection.beginTransaction();

    try {
      // Add stock transaction with vendor
      const [result] = await connection.execute(
        `INSERT INTO stock_transactions (
          drug_id, vendor_id, type, purchase_quantity, 
          sale_quantity, batch_number, expiry_date, 
          notes, created_by
        ) VALUES (?, ?, 'in', ?, ?, ?, ?, ?, ?)`,
        [id, vendorId, purchaseQuantity, saleQuantity, batchNumber, expiryDate, notes, req.user?.id]
      );

      // Update drug stock
      await connection.execute(
        'UPDATE drugs SET stock = stock + ? WHERE id = ?',
        [saleQuantity, id]
      );

      // Get drug name
      const [[drug]] = await connection.execute(
        'SELECT name FROM drugs WHERE id = ?',
        [id]
      ) as [RowDataPacket[], any];

      // Create notification for admins
      await connection.execute(
        `INSERT INTO notifications (type, message) VALUES (?, ?)`,
        [
          'restock_pending',
          `New restock request for ${drug.name} is pending approval`
        ]
      );

      await connection.commit();

      await createAuditLog({
        userId: req.user?.id || 0,
        actionType: 'create',
        entityType: 'stock',
        entityId: (result as ResultSetHeader).insertId,
        details: { 
          drugId: id,
          vendorId,
          purchaseQuantity,
          saleQuantity,
          batchNumber,
          expiryDate,
          notes 
        },
        ipAddress: getClientIp(req)
      });

      res.json({ message: 'Stock updated successfully' });
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
export const getCategories = async (req: Request, res: Response): Promise<void> => {
  try {
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.max(1, parseInt(req.query.limit as string) || 10);
    const offset = (page - 1) * limit;

    const [categories] = await pool.execute(
      'SELECT * FROM drug_categories ORDER BY name ASC LIMIT ?, ?',
      [offset.toString(), limit.toString()]
    ) as [RowDataPacket[], any];

    const [total] = await pool.execute(
      'SELECT COUNT(*) as count FROM drug_categories'
    ) as [RowDataPacket[], any];

    res.json({
      data: categories,
      page,
      totalPages: Math.ceil(total[0].count / limit),
      hasMore: (categories as any[]).length === limit
    });
  } catch (error) {
    console.error('Error fetching categories:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

export const createCategory = async (
  req: AuthenticatedRequest, 
  res: Response
): Promise<void | Response> => {
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
    return res.status(500).json({ message: 'Server error' });
  }
};

export const deleteCategory = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    // Check if category is in use
    const [drugs] = await pool.execute(
      'SELECT COUNT(*) as count FROM drugs WHERE category_id = ?',
      [id]
    ) as [RowDataPacket[], any];

    if (drugs[0].count > 0) {
       res.status(400).json({ 
        message: 'Cannot delete category that is in use by drugs' 
      });
    }

    const [result] = await pool.execute(
      'DELETE FROM drug_categories WHERE id = ?',
      [id]
    );

    const deleteResult = result as ResultSetHeader;
    if (deleteResult.affectedRows === 0) {
       res.status(404).json({ message: 'Category not found' });
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
export const getForms = async (req: Request, res: Response): Promise<void> => {
  try {
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.max(1, parseInt(req.query.limit as string) || 10);
    const offset = (page - 1) * limit;

    const [forms] = await pool.execute(
      'SELECT * FROM drug_forms ORDER BY name ASC LIMIT ?, ?',
      [offset.toString(), limit.toString()]
    );

    res.json({
      data: forms,
      page,
      hasMore: (forms as any[]).length === limit
    });
  } catch (error) {
    console.error('Error fetching forms:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

export const createForm = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { name, description } = req.body;

    // Check if form exists
    const [existing] = await pool.execute(
      'SELECT id FROM drug_forms WHERE name = ?',
      [name]
    ) as [RowDataPacket[], any];

    if (existing.length > 0) {
      res.status(400).json({ message: 'Form already exists' });
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

export const deleteForm = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    // Check if form is in use
    const [drugs] = await pool.execute(
      'SELECT COUNT(*) as count FROM drugs WHERE form_id = ?',
      [id]
    ) as [RowDataPacket[], any];

    if (drugs[0].count > 0) {
       res.status(400).json({ 
        message: 'Cannot delete form that is in use by drugs' 
      });
    }

    const [result] = await pool.execute(
      'DELETE FROM drug_forms WHERE id = ?',
      [id]
    );

    const deleteResult = result as ResultSetHeader;
    if (deleteResult.affectedRows === 0) {
       res.status(404).json({ message: 'Form not found' });
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

export const updateDrug = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
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
       res.status(400).json({ message: 'Invalid category' });
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

export const getVendors = async (req: Request, res: Response): Promise<void | Response> => {
  try {
    const [vendors] = await pool.execute(
      'SELECT * FROM vendors ORDER BY name ASC'
    ) as [RowDataPacket[], any];

    res.json(vendors);
  } catch (error) {
    console.error('Error fetching vendors:', error);
    return res.status(500).json({ message: 'Server error' });
  }
};

export const createVendor = async (req: AuthenticatedRequest, res: Response): Promise<void | Response> => {
  try {
    const data = req.body as VendorData;

    const [result] = await pool.execute(
      `INSERT INTO vendors (name, contact_person, phone, email, address) 
       VALUES (?, ?, ?, ?, ?)`,
      [data.name, data.contactPerson, data.phone, data.email, data.address]
    );

    const insertResult = result as ResultSetHeader;

    await createAuditLog({
      userId: req.user?.id || 0,
      actionType: 'create',
      entityType: 'vendor',
      entityId: insertResult.insertId,
      details: data,
      ipAddress: getClientIp(req)
    });

    res.status(201).json({
      id: insertResult.insertId,
      ...data
    });
  } catch (error) {
    console.error('Error creating vendor:', error);
    return res.status(500).json({ message: 'Server error' });
  }
};

export const updateVendor = async (req: AuthenticatedRequest, res: Response): Promise<void | Response> => {
  try {
    const { id } = req.params;
    const data = req.body as VendorData;

    await pool.execute(
      `UPDATE vendors 
       SET name = ?, contact_person = ?, phone = ?, email = ?, address = ? 
       WHERE id = ?`,
      [data.name, data.contactPerson, data.phone, data.email, data.address, id]
    );

    await createAuditLog({
      userId: req.user?.id || 0,
      actionType: 'update',
      entityType: 'vendor',
      entityId: id,
      details: data,
      ipAddress: getClientIp(req)
    });

    res.json({ message: 'Vendor updated successfully' });
  } catch (error) {
    console.error('Error updating vendor:', error);
    return res.status(500).json({ message: 'Server error' });
  }
};

export const toggleVendorActive = async (req: AuthenticatedRequest, res: Response): Promise<void | Response> => {
  try {
    const { id } = req.params;

    await pool.execute(
      'UPDATE vendors SET active = NOT active WHERE id = ?',
      [id]
    );

    await createAuditLog({
      userId: req.user?.id || 0,
      actionType: 'update',
      entityType: 'vendor',
      entityId: id,
      details: { action: 'toggle_active' },
      ipAddress: getClientIp(req)
    });

    res.json({ message: 'Vendor status updated successfully' });
  } catch (error) {
    console.error('Error toggling vendor status:', error);
    return res.status(500).json({ message: 'Server error' });
  }
}; 

export const getInventoryStats = async (req: Request, res: Response): Promise<void> => {
  try {
    // Get total drugs count
    const [totalDrugs] = await pool.execute(
      'SELECT COUNT(*) as count FROM drugs WHERE active = true'
    ) as [RowDataPacket[], any];

    // Get low stock count
    const [lowStock] = await pool.execute(
      'SELECT COUNT(*) as count FROM drugs WHERE stock <= min_stock AND active = true'
    ) as [RowDataPacket[], any];

    // Get expiring count
    const [expiring] = await pool.execute(
      `SELECT COUNT(*) as count FROM drugs 
       WHERE expiry_date <= DATE_ADD(CURDATE(), INTERVAL 3 MONTH)
       AND stock > 0 AND active = true`
    ) as [RowDataPacket[], any];

    // Get total inventory value
    const [value] = await pool.execute(
      'SELECT SUM(stock * unit_cost) as total FROM drugs WHERE active = true'
    ) as [RowDataPacket[], any];

    res.json({
      totalDrugs: totalDrugs[0].count,
      lowStockCount: lowStock[0].count,
      expiringCount: expiring[0].count,
      totalValue: value[0].total || 0
    });
  } catch (error) {
    console.error('Error fetching inventory stats:', error);
    res.status(500).json({ message: 'Server error' });
  }
}; 

export const getTransactions = async (req: Request, res: Response): Promise<void> => {
  try {
    const [transactions] = await pool.execute(`
      SELECT 
        t.id,
        d.name as drugName,
        v.name as vendorName,
        t.purchase_quantity as purchaseQuantity,
        t.sale_quantity as saleQuantity,
        pf.name as purchaseForm,
        sf.name as saleForm,
        t.batch_number as batchNumber,
        t.expiry_date as expiryDate,
        t.created_at as createdAt,
        u.username as createdBy
      FROM stock_transactions t
      JOIN drugs d ON t.drug_id = d.id
      LEFT JOIN vendors v ON t.vendor_id = v.id
      JOIN drug_forms pf ON d.purchase_form_id = pf.id
      JOIN drug_forms sf ON d.sale_form_id = sf.id
      JOIN users u ON t.created_by = u.id
      WHERE t.type = 'in'
      ORDER BY t.created_at DESC
      LIMIT 100
    `) as [RowDataPacket[], any];

    res.json(transactions);
  } catch (error) {
    console.error('Error fetching transactions:', error);
    res.status(500).json({ message: 'Server error' });
  }
}; 

export const restock = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const connection = await pool.getConnection();
  try {
    const { vendorId, referenceNumber, items } = req.body;
    const isAdmin = req.user?.role === 'admin';

    await connection.beginTransaction();

    for (const item of items) {
      // Add stock transaction
      const [result] = await connection.execute(
        `INSERT INTO stock_transactions (
          drug_id, vendor_id, type, 
          purchase_quantity, sale_quantity,
          batch_number, expiry_date, 
          reference_number, created_by,
          status
        ) VALUES (?, ?, 'in', ?, ?, ?, ?, ?, ?, ?)`,
        [
          item.drugId,
          vendorId,
          item.purchaseUnit === 'purchase' ? item.quantity : Math.ceil(item.quantity / item.unitsPerPurchase),
          item.purchaseUnit === 'purchase' ? item.quantity * item.unitsPerPurchase : item.quantity,
          item.batchNumber,
          item.expiryDate,
          referenceNumber,
          req.user?.id,
          isAdmin ? 'approved' : 'pending' // Auto-approve if admin
        ]
      );

      // If admin, update stock immediately
      if (isAdmin) {
        const saleQuantity = item.purchaseUnit === 'purchase' 
          ? item.quantity * item.unitsPerPurchase 
          : item.quantity;

        await connection.execute(
          'UPDATE drugs SET stock = stock + ? WHERE id = ?',
          [saleQuantity, item.drugId]
        );
      }
    }

    await connection.commit();
    res.json({ 
      message: isAdmin ? 'Restock completed' : 'Restock request submitted for approval' 
    });

  } catch (error) {
    await connection.rollback();
    console.error('Error in restock:', error);
    res.status(500).json({ message: 'Server error' });
  } finally {
    connection.release();
  }
}; 

export const approveRestock = async (req: AuthenticatedRequest, res: Response) => {
  const connection = await pool.getConnection();
  try {
    const { id } = req.params;
    const { status } = req.body;
    
    // Get restock details for notification
    const [[restock]] = await connection.execute(`
      SELECT t.*, d.name as drugName, t.created_by as requesterId
      FROM stock_transactions t 
      JOIN drugs d ON t.drug_id = d.id 
      WHERE t.id = ?
    `, [id]) as [RowDataPacket[], any];

    // Check if restock exists and is pending
    const [existing] = await connection.execute(
      'SELECT * FROM stock_transactions WHERE id = ?',
      [id]
    ) as [RowDataPacket[], any];

    if (!existing.length) {
      return res.status(404).json({ message: 'Restock not found' });
    }

    if (existing[0].status !== 'pending') {
      return res.status(400).json({ 
        message: `Restock has already been ${existing[0].status}` 
      });
    }

    await connection.beginTransaction();

    // Update transaction status
    await connection.execute(
      `UPDATE stock_transactions 
       SET status = ?, 
           approved_by = ?, 
           approved_at = CURRENT_TIMESTAMP
       WHERE id = ?`,
      [status, req.user?.id, id]
    );

    // If approved, update drug stock
    if (status === 'approved') {
      await connection.execute(
        'UPDATE drugs SET stock = stock + ? WHERE id = ?',
        [existing[0].sale_quantity, existing[0].drug_id]
      );

      // Create audit log
      await createAuditLog({
        userId: req.user?.id || 0,
        actionType: 'update',
        entityType: 'stock',
        entityId: existing[0].drug_id,
        details: {
          action: 'restock_approved',
          quantity: existing[0].sale_quantity,
          transactionId: id
        },
        ipAddress: getClientIp(req)
      });
    }

    // Create notification for the requester
    await connection.execute(
      `INSERT INTO notifications (user_id, type, message) VALUES (?, ?, ?)`,
      [
        restock.requesterId,
        status === 'approved' ? 'restock_approved' : 'restock_rejected',
        `Your restock request for ${restock.drugName} has been ${status}`
      ]
    );

    await connection.commit();
    res.json({ message: `Restock ${status}` });

  } catch (error) {
    await connection.rollback();
    console.error('Error approving restock:', error);
    res.status(500).json({ message: 'Server error' });
  } finally {
    connection.release();
  }
}; 

export const getPendingRestocks = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const [restocks] = await pool.execute(`
      SELECT 
        t.*,
        d.name as drugName,
        v.name as vendorName,
        t.approved_by as approvedBy,
        t.approved_at as approvedAt,
        approver.username as approverName
      FROM stock_transactions t
      JOIN drugs d ON t.drug_id = d.id
      JOIN vendors v ON t.vendor_id = v.id
      LEFT JOIN users approver ON t.approved_by = approver.id
      WHERE t.status = 'pending'
      ORDER BY t.created_at DESC
    `);

    res.json(restocks);
  } catch (error) {
    console.error('Error fetching pending restocks:', error);
    res.status(500).json({ message: 'Server error' });
  }
}; 

export const getRestockHistory = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const [history] = await pool.execute(`
      SELECT 
        t.*,
        d.name as drugName,
        v.name as vendorName,
        pf.name as purchaseForm,
        sf.name as saleForm,
        creator.username as createdBy,
        approver.username as approverName,
        DATE_FORMAT(t.created_at, '%Y-%m-%dT%H:%i:%s.000Z') as createdAt,
        DATE_FORMAT(t.approved_at, '%Y-%m-%dT%H:%i:%s.000Z') as approvedAt,
        DATE_FORMAT(t.expiry_date, '%Y-%m-%d') as expiryDate,
        t.batch_number as batchNumber,
        CAST(d.purchase_price AS DECIMAL(10,2)) as purchasePrice,
        CAST(d.unit_cost AS DECIMAL(10,2)) as unitCost,
        CAST(d.pos_price AS DECIMAL(10,2)) as posPrice,
        CAST(d.prescription_price AS DECIMAL(10,2)) as prescriptionPrice,
        CAST(d.pos_markup AS DECIMAL(10,2)) as posMarkup,
        CAST(d.prescription_markup AS DECIMAL(10,2)) as prescriptionMarkup
      FROM stock_transactions t
      JOIN drugs d ON t.drug_id = d.id
      JOIN vendors v ON t.vendor_id = v.id
      JOIN drug_forms pf ON d.purchase_form_id = pf.id
      JOIN drug_forms sf ON d.sale_form_id = sf.id
      JOIN users creator ON t.created_by = creator.id
      LEFT JOIN users approver ON t.approved_by = approver.id
      WHERE t.status != 'pending'
      ORDER BY t.created_at DESC
      LIMIT 100
    `);

    res.json(history);
  } catch (error) {
    console.error('Error fetching restock history:', error);
    res.status(500).json({ message: 'Server error' });
  }
}; 