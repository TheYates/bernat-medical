import { Request, Response } from 'express';
import { pool } from '../db';
import { RowDataPacket } from 'mysql2';

export const getDrugs = async (req: Request, res: Response) => {
  console.log('getDrugs endpoint hit');
  console.log('Auth header:', req.headers.authorization);
  
  try {
    const query = `
      SELECT 
        id,
        name as genericName,
        strength,
        unit,
        min_stock as minimumStock,
        stock as saleQuantity,
        prescription_price as salePricePerUnit,
        active
      FROM drugs
      WHERE active = 1
      ORDER BY name ASC
    `;

    const [drugs] = await pool.execute(query) as [RowDataPacket[], any];
    
    if (!drugs.length) {
      console.log('No drugs found in database');
      return res.json([]);
    }

    console.log(`Found ${drugs.length} drugs`);
    res.json(drugs);
  } catch (error) {
    console.error('Error in getDrugs:', error);
    res.status(500).json({ message: 'Failed to fetch drugs' });
  }
};

export const searchDrugs = async (req: Request, res: Response) => {
  try {
    const { q } = req.query;
    
    if (!q) {
      return res.json([]);
    }

    const query = `
      SELECT 
        id,
        name as genericName,
        strength,
        unit,
        min_stock as minimumStock,
        stock as saleQuantity,
        prescription_price,
        active
      FROM drugs
      WHERE 
        active = 1 
        AND name LIKE ?
      ORDER BY name ASC
      LIMIT 50
    `;

    const searchTerm = `%${q}%`;
    const [drugs] = await pool.execute(query, [searchTerm]) as [RowDataPacket[], any];

    // Transform the data to match the frontend interface
    const transformedDrugs = drugs.map((drug: any) => ({
      id: drug.id,
      genericName: drug.genericName,
      brandName: null,
      strength: drug.strength,
      form: drug.unit,
      saleQuantity: drug.saleQuantity,
      minimumStock: drug.minimumStock,
      salePricePerUnit: drug.prescription_price,
      active: Boolean(drug.active)
    }));

    res.json(transformedDrugs);
  } catch (error) {
    console.error('Error searching drugs:', error);
    res.status(500).json({ message: 'Failed to search drugs' });
  }
}; 