import { Request, Response } from "express";
import { pool } from "../db";
import { RowDataPacket } from "mysql2";

export const getDrugs = async (req: Request, res: Response) => {
  try {
    const query = `
      SELECT 
        id,
        name as genericName,
        unit as form,
        strength,
        COALESCE(pos_price, purchase_price) as posPrice,
        prescription_price,
        purchase_price as salePricePerUnit,
        stock,
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

    // Transform to match frontend interface
    const transformedDrugs = drugs.map((drug: any) => ({
      id: drug.id,
      genericName: drug.genericName,
      brandName: null,
      form: drug.form,
      strength: drug.strength,
      posPrice: drug.posPrice,
      prescriptionPrice: drug.prescription_price,
      salePricePerUnit: drug.salePricePerUnit,
      stock: drug.stock,
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
        generic_name,
        brand_name,
        form,
        strength,
        COALESCE(pos_price, sale_price_per_unit) as posPrice,
        prescription_price,
        sale_price_per_unit as salePricePerUnit,
        stock,
        active
      FROM drugs
      WHERE 
        active = 1 
        AND generic_name LIKE ?
      ORDER BY generic_name ASC
      LIMIT 50
    `;

    const searchTerm = `%${q}%`;
    const [drugs] = (await pool.execute(query, [searchTerm])) as [
      RowDataPacket[],
      any
    ];

    // Transform the data to match the frontend interface
    const transformedDrugs = drugs.map((drug: any) => ({
      id: drug.id,
      genericName: drug.generic_name,
      brandName: drug.brand_name,
      form: drug.form,
      strength: drug.strength,
      posPrice: drug.posPrice,
      prescriptionPrice: drug.prescription_price,
      salePricePerUnit: drug.salePricePerUnit,
      stock: drug.stock,
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
        name as genericName,
        unit as form,
        strength,
        COALESCE(pos_price, purchase_price) as posPrice,
        prescription_price,
        purchase_price as salePricePerUnit,
        stock,
        active
      FROM drugs
      WHERE active = 1 
      AND stock > 0
      ORDER BY name ASC
    `;

    const [drugs] = (await pool.execute(query)) as [RowDataPacket[], any];

    // Transform to match frontend interface
    const transformedDrugs = drugs.map((drug: any) => ({
      id: drug.id,
      genericName: drug.genericName,
      brandName: null,
      form: drug.form,
      strength: drug.strength,
      posPrice: drug.posPrice,
      prescriptionPrice: drug.prescription_price,
      salePricePerUnit: drug.salePricePerUnit,
      stock: drug.stock,
      active: Boolean(drug.active),
    }));

    res.json(transformedDrugs);
  } catch (error) {
    console.error("Error fetching active drugs:", error);
    res.status(500).json({ message: "Failed to fetch drugs" });
  }
};
