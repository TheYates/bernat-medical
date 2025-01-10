import { Request, Response } from "express";
import { pool } from "../db";
import { RowDataPacket } from "mysql2";

export const getDrugs = async (req: Request, res: Response) => {
  try {
    const query = `
      SELECT 
        id,
        name,
        unit,
        strength,
        COALESCE(pos_price, purchase_price) as pos_price,
        prescription_price,
        purchase_price,
        stock,
        min_stock,
        active
      FROM drugs
      WHERE active = 1
      ORDER BY name ASC
    `;

    const [drugs] = (await pool.execute(query)) as [RowDataPacket[], any];

    if (!drugs.length) {
      console.log("No drugs found in database");
      return res.json([]);
    }

    // Transform to match database column names
    const transformedDrugs = drugs.map((drug: any) => ({
      id: drug.id,
      name: drug.name,
      unit: drug.unit,
      strength: drug.strength,
      pos_price: drug.pos_price,
      prescription_price: drug.prescription_price,
      purchase_price: drug.purchase_price,
      stock: drug.stock,
      min_stock: drug.min_stock,
      active: Boolean(drug.active),
    }));

    res.json(transformedDrugs);
  } catch (error) {
    console.error("Error in getDrugs:", error);
    res.status(500).json({ message: "Failed to fetch drugs" });
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
        name,
        unit,
        strength,
        COALESCE(pos_price, purchase_price) as pos_price,
        prescription_price,
        purchase_price,
        stock,
        min_stock,
        active
      FROM drugs
      WHERE 
        active = 1 
        AND name LIKE ?
      ORDER BY name ASC
      LIMIT 50
    `;

    const searchTerm = `%${q}%`;
    const [drugs] = (await pool.execute(query, [searchTerm])) as [
      RowDataPacket[],
      any
    ];

    const transformedDrugs = drugs.map((drug: any) => ({
      id: drug.id,
      name: drug.name,
      unit: drug.unit,
      strength: drug.strength,
      pos_price: drug.pos_price,
      prescription_price: drug.prescription_price,
      purchase_price: drug.purchase_price,
      stock: drug.stock,
      min_stock: drug.min_stock,
      active: Boolean(drug.active),
    }));

    res.json(transformedDrugs);
  } catch (error) {
    console.error("Error searching drugs:", error);
    res.status(500).json({ message: "Failed to search drugs" });
  }
};

export const getActiveDrugs = async (req: Request, res: Response) => {
  try {
    const query = `
      SELECT 
        id,
        name,
        unit,
        strength,
        COALESCE(pos_price, purchase_price) as pos_price,
        prescription_price,
        purchase_price,
        stock,
        min_stock,
        active
      FROM drugs
      WHERE active = 1 
      AND stock > 0
      ORDER BY name ASC
    `;

    const [drugs] = (await pool.execute(query)) as [RowDataPacket[], any];

    const transformedDrugs = drugs.map((drug: any) => ({
      id: drug.id,
      name: drug.name,
      unit: drug.unit,
      strength: drug.strength,
      pos_price: drug.pos_price,
      prescription_price: drug.prescription_price,
      purchase_price: drug.purchase_price,
      stock: drug.stock,
      min_stock: drug.min_stock,
      active: Boolean(drug.active),
    }));

    res.json(transformedDrugs);
  } catch (error) {
    console.error("Error fetching active drugs:", error);
    res.status(500).json({ message: "Failed to fetch drugs" });
  }
};
