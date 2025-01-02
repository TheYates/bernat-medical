import { Request, Response } from "express";
import { pool } from "../db";
import { createAuditLog } from "../services/audit.service";
import type { AuthenticatedRequest } from "../types/auth";
import type { RowDataPacket } from "mysql2";

export const registerPatient = async (
  req: AuthenticatedRequest,
  res: Response
) => {
  try {
    const {
      firstName,
      middleName,
      lastName,
      dateOfBirth,
      gender,
      contact,
      maritalStatus,
      residence,
      emergencyContactName,
      emergencyContactNumber,
      emergencyContactRelation,
    } = req.body;

    // Get clinic settings for ID format
    const [settings] = (await pool.execute(
      "SELECT id_prefix, digit_length FROM clinic_settings WHERE id = 1"
    )) as [RowDataPacket[], any];

    // Get last patient's clinic ID
    const [lastPatient] = (await pool.execute(
      "SELECT clinic_id FROM patients ORDER BY id DESC LIMIT 1"
    )) as [RowDataPacket[], any];

    // Generate next clinic ID
    let nextNumber = 1;
    if (lastPatient.length > 0) {
      const lastId = lastPatient[0].clinic_id;
      const numericPart = parseInt(lastId.replace(settings[0].id_prefix, ""));
      nextNumber = numericPart + 1;
    }

    const clinicId = `${settings[0].id_prefix}${String(nextNumber).padStart(
      settings[0].digit_length,
      "0"
    )}`;

    // Insert patient with generated clinic ID
    const [result] = await pool.execute(
      `INSERT INTO patients (
        clinic_id, first_name, middle_name, last_name, 
        date_of_birth, gender, contact, marital_status,
        residence, emergency_contact_name, 
        emergency_contact_number, emergency_contact_relation
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        clinicId,
        firstName,
        middleName,
        lastName,
        dateOfBirth,
        gender,
        contact,
        maritalStatus,
        residence,
        emergencyContactName,
        emergencyContactNumber,
        emergencyContactRelation,
      ]
    );

    // Create audit log
    await createAuditLog({
      userId: req.user?.id || 0,
      actionType: "create",
      entityType: "patient",
      entityId: clinicId,
      details: { ...req.body, clinicId },
      ipAddress: req.ip || "unknown",
    });

    res.status(201).json({
      message: "Patient registered successfully",
      patientId: clinicId,
    });
  } catch (error: any) {
    console.error("Error registering patient:", error);
    if (error.code === "ER_DUP_ENTRY") {
      return res.status(400).json({
        message: "A patient with this clinic ID already exists",
      });
    }
    res.status(500).json({ message: "Failed to register patient" });
  }
};

export const getLastPatientId = async (req: Request, res: Response) => {
  console.log("Fetching last patient ID");
  try {
    // Get clinic settings for ID format
    const [settings] = (await pool.execute(
      "SELECT id_prefix, digit_length FROM clinic_settings WHERE id = 1"
    )) as [RowDataPacket[], any];

    // Get last patient's clinic ID
    const [lastPatient] = (await pool.execute(
      "SELECT clinic_id FROM patients ORDER BY id DESC LIMIT 1"
    )) as [RowDataPacket[], any];

    const prefix = settings[0]?.id_prefix || "CLN";
    const digitLength = settings[0]?.digit_length || 6;
    const lastId = lastPatient[0]?.clinic_id || null;

    console.log("Settings:", settings);
    console.log("Last patient:", lastPatient);
    res.json({
      settings: {
        prefix,
        digitLength,
      },
      lastId,
    });
  } catch (error) {
    console.error("Error fetching last patient ID:", error);
    res.status(500).json({ message: "Failed to fetch last patient ID" });
  }
};

export const getPatientByClinicId = async (req: Request, res: Response) => {
  try {
    const clinicId = req.params.clinicId;

    const [patients] = (await pool.execute(
      `SELECT 
        id, clinic_id, first_name, middle_name, last_name,
        date_of_birth, gender, contact, marital_status, residence
      FROM patients 
      WHERE clinic_id = ?`,
      [clinicId]
    )) as [RowDataPacket[], any];

    if (patients.length === 0) {
      return res.status(404).json({ message: "Patient not found" });
    }

    const patient = patients[0];

    res.json({
      id: patient.id,
      clinicId: patient.clinic_id,
      firstName: patient.first_name,
      middleName: patient.middle_name,
      lastName: patient.last_name,
      dateOfBirth: patient.date_of_birth,
      gender: patient.gender,
      contact: patient.contact,
      maritalStatus: patient.marital_status,
      residence: patient.residence,
    });
  } catch (error) {
    console.error("Error fetching patient:", error);
    res.status(500).json({ message: "Failed to fetch patient" });
  }
};

export const searchPatients = async (req: Request, res: Response) => {
  try {
    const { searchTerm, gender, maritalStatus } = req.query;

    let query = `
      SELECT id, clinic_id, first_name, middle_name, last_name,
             date_of_birth, gender, contact, marital_status
      FROM patients
      WHERE 1=1
    `;
    const params: any[] = [];

    if (searchTerm) {
      query += ` AND (
        first_name LIKE ? OR
        middle_name LIKE ? OR
        last_name LIKE ? OR
        contact LIKE ? OR
        clinic_id LIKE ?
      )`;
      const term = `%${searchTerm}%`;
      params.push(term, term, term, term, term);
    }

    if (gender && gender !== "any") {
      query += ` AND gender = ?`;
      params.push(gender);
    }

    if (maritalStatus && maritalStatus !== "any") {
      query += ` AND marital_status = ?`;
      params.push(maritalStatus);
    }

    query += ` ORDER BY first_name ASC LIMIT 10`;

    const [patients] = (await pool.execute(query, params)) as [
      RowDataPacket[],
      any
    ];

    res.json(
      patients.map((p) => ({
        id: p.id,
        clinicId: p.clinic_id,
        firstName: p.first_name,
        middleName: p.middle_name,
        lastName: p.last_name,
        dateOfBirth: p.date_of_birth,
        gender: p.gender,
        contact: p.contact,
        maritalStatus: p.marital_status,
      }))
    );
  } catch (error) {
    console.error("Error searching patients:", error);
    res.status(500).json({ message: "Failed to search patients" });
  }
};
