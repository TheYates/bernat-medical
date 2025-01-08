-- First, ensure all columns have correct types and constraints
ALTER TABLE prescriptions 
  MODIFY patient_id INT NOT NULL,
  MODIFY drug_id INT NOT NULL,
  MODIFY dosage VARCHAR(50) NOT NULL,
  MODIFY frequency VARCHAR(50) NOT NULL,
  MODIFY duration VARCHAR(50) NOT NULL,
  MODIFY quantity INT NOT NULL,
  MODIFY route VARCHAR(50) NOT NULL,
  MODIFY created_by INT NOT NULL,
  MODIFY created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  MODIFY dispensed BOOLEAN NOT NULL DEFAULT FALSE,
  MODIFY dispensed_by INT NULL,
  MODIFY dispensed_at TIMESTAMP NULL;

-- Add foreign key constraints if missing
ALTER TABLE prescriptions
  ADD CONSTRAINT fk_prescription_patient 
    FOREIGN KEY (patient_id) REFERENCES patients(id),
  ADD CONSTRAINT fk_prescription_drug 
    FOREIGN KEY (drug_id) REFERENCES drugs(id),
  ADD CONSTRAINT fk_prescription_creator 
    FOREIGN KEY (created_by) REFERENCES users(id),
  ADD CONSTRAINT fk_prescription_dispenser 
    FOREIGN KEY (dispensed_by) REFERENCES users(id);

-- Add indexes for better performance
ALTER TABLE prescriptions
  ADD INDEX idx_patient_id (patient_id),
  ADD INDEX idx_drug_id (drug_id),
  ADD INDEX idx_created_by (created_by),
  ADD INDEX idx_dispensed (dispensed); 