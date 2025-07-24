export {};

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

    const [rows] = await pool.execute<RowDataPacket[]>(
      `SELECT p.*,
        (SELECT JSON_OBJECT(
          'temperatureC', v.temperature_c,
          'temperatureF', v.temperature_f,
          'systolic', v.systolic,
          'diastolic', v.diastolic,
          'pulseRate', v.pulse_rate,
          'respiratoryRate', v.respiratory_rate,
          'oxygenSaturation', v.oxygen_saturation,
          'weight', v.weight,
          'height', v.height,
          'fbs', v.fbs,
          'rbs', v.rbs,
          'fhr', v.fhr,
          'createdAt', v.created_at,
          'recordedBy', (
            SELECT JSON_OBJECT(
              'id', u.id,
              'fullName', u.full_name
            )
            FROM users u 
            WHERE u.id = v.recorded_by
          )
        )
        FROM vital_signs v 
        WHERE v.patient_id = p.id 
        AND DATE(v.created_at) = CURDATE()
        ORDER BY v.created_at DESC 
        LIMIT 1) as todayVitalSigns
      FROM patients p 
      WHERE p.clinic_id = ?`,
      [clinicId]
    );

    if (!rows.length) {
      return res.status(404).json({ message: "Patient not found" });
    }

    const patientData = rows[0];

    res.json({
      id: patientData.id,
      clinicId: patientData.clinic_id,
      firstName: patientData.first_name,
      middleName: patientData.middle_name,
      lastName: patientData.last_name,
      dateOfBirth: patientData.date_of_birth,
      gender: patientData.gender,
      contact: patientData.contact,
      maritalStatus: patientData.marital_status,
      residence: patientData.residence,
      todayVitalSigns: patientData.todayVitalSigns,
    });
  } catch (error) {
    console.error("Error fetching patient:", error);
    res.status(500).json({ message: "Failed to fetch patient" });
  }
};

export const searchPatients = async (
  req: AuthenticatedRequest,
  res: Response
) => {
  try {
    const { searchTerm, gender, ageRange, maritalStatus, lastVisit } =
      req.query as Record<string, string>;

    let query = "SELECT * FROM patients WHERE 1=1";
    const params: any[] = [];

    if (searchTerm) {
      query +=
        " AND (first_name LIKE ? OR middle_name LIKE ? OR last_name LIKE ? OR clinic_id LIKE ? OR contact LIKE ?)";
      params.push(
        `%${searchTerm}%`,
        `%${searchTerm}%`,
        `%${searchTerm}%`,
        `%${searchTerm}%`,
        `%${searchTerm}%`
      );
    }

    if (gender && gender !== "any") {
      query += " AND gender = ?";
      params.push(gender);
    }

    if (maritalStatus && maritalStatus !== "any") {
      query += " AND marital_status = ?";
      params.push(maritalStatus);
    }

    // Example age range filter
    if (ageRange && ageRange !== "any") {
      const [minAge, maxAge] = ageRange.split("-");
      query +=
        " AND TIMESTAMPDIFF(YEAR, date_of_birth, CURDATE()) BETWEEN ? AND ?";
      params.push(minAge, maxAge);
    }

    // Example last visit filter
    if (lastVisit && lastVisit !== "any") {
      const dateCondition = {
        today: "= CURDATE()",
        week: ">= DATE_SUB(CURDATE(), INTERVAL 1 WEEK)",
        month: ">= DATE_SUB(CURDATE(), INTERVAL 1 MONTH)",
        year: ">= DATE_SUB(CURDATE(), INTERVAL 1 YEAR)",
      }[lastVisit];
      if (dateCondition) {
        query += ` AND last_visit ${dateCondition}`;
      }
    }

    const [patients] = (await pool.execute(query, params)) as [
      RowDataPacket[],
      any
    ];

    const mappedPatients = patients.map((patient: any) => ({
      id: patient.id,
      firstName: patient.first_name,
      middleName: patient.middle_name,
      lastName: patient.last_name,
      clinicId: patient.clinic_id,
      gender: patient.gender,
      contact: patient.contact,
      maritalStatus: patient.marital_status,
      lastVisit: patient.last_visit,
    }));

    res.json(mappedPatients);
  } catch (error) {
    console.error("Error searching patients:", error);
    res.status(500).json({ message: "Failed to search patients" });
  }
};

export const searchPatientByClinicId = async (req: Request, res: Response) => {
  try {
    const { clinicId } = req.query;

    const [patients] = await pool.execute<RowDataPacket[]>(
      `SELECT 
        id,
        clinic_id as clinicId,
        first_name as firstName,
        middle_name as middleName,
        last_name as lastName,
        date_of_birth as dateOfBirth,
        gender
      FROM patients 
      WHERE clinic_id = ?
      LIMIT 1`,
      [clinicId]
    );

    if (!patients.length) {
      return res.status(404).json({ message: "Patient not found" });
    }

    res.json(patients[0]);
  } catch (error) {
    console.error("Error searching patient:", error);
    res.status(500).json({ message: "Failed to search patient" });
  }
};

export const updatePatient = async (
  req: AuthenticatedRequest,
  res: Response
) => {
  try {
    const { clinicId } = req.params;
    const updates = req.body;

    await pool.execute(
      `UPDATE patients SET 
        first_name = ?,
        middle_name = ?,
        last_name = ?,
        date_of_birth = ?,
        gender = ?,
        contact = ?,
        marital_status = ?,
        residence = ?,
        emergency_contact_name = ?,
        emergency_contact_number = ?,
        emergency_contact_relation = ?
      WHERE clinic_id = ?`,
      [
        updates.firstName,
        updates.middleName,
        updates.lastName,
        updates.dateOfBirth,
        updates.gender,
        updates.contact,
        updates.maritalStatus,
        updates.residence,
        updates.emergencyContactName,
        updates.emergencyContactNumber,
        updates.emergencyContactRelation,
        clinicId,
      ]
    );

    await createAuditLog({
      userId: req.user?.id || 0,
      actionType: "update",
      entityType: "patient",
      entityId: clinicId,
      details: updates,
      ipAddress: req.ip || "unknown",
    });

    res.json({ message: "Patient updated successfully" });
  } catch (error) {
    console.error("Error updating patient:", error);
    res.status(500).json({ message: "Failed to update patient" });
  }
};

export const deletePatient = async (
  req: AuthenticatedRequest,
  res: Response
) => {
  try {
    const { clinicId } = req.params;

    await pool.execute("DELETE FROM patients WHERE clinic_id = ?", [clinicId]);

    await createAuditLog({
      userId: req.user?.id || 0,
      actionType: "delete",
      entityType: "patient",
      entityId: clinicId,
      details: { clinicId },
      ipAddress: req.ip || "unknown",
    });

    res.json({ message: "Patient deleted successfully" });
  } catch (error) {
    console.error("Error deleting patient:", error);
    res.status(500).json({ message: "Failed to delete patient" });
  }
};

export const getPatients = async (req: Request, res: Response) => {
  try {
    const [patients] = await pool.execute("SELECT * FROM patients");
    res.json(patients);
  } catch (error) {
    console.error("Error fetching patients:", error);
    res.status(500).json({ message: "Failed to fetch patients" });
  }
};
