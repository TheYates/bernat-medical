-- Drop duplicate foreign keys
ALTER TABLE prescriptions
  DROP FOREIGN KEY prescriptions_ibfk_1,
  DROP FOREIGN KEY prescriptions_ibfk_2,
  DROP FOREIGN KEY prescriptions_ibfk_3,
  DROP FOREIGN KEY prescriptions_ibfk_4,
  DROP FOREIGN KEY prescriptions_ibfk_5;

-- Keep only the named constraints
ALTER TABLE prescriptions
  MODIFY patient_id int NOT NULL,
  MODIFY drug_id int NOT NULL,
  MODIFY created_by int NOT NULL,
  MODIFY created_at timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP; 