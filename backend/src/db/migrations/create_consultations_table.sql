CREATE TABLE IF NOT EXISTS consultations (
  id INT PRIMARY KEY AUTO_INCREMENT,
  patient_id INT NOT NULL,
  doctor_id INT NOT NULL,
  complaints TEXT NOT NULL,
  clinical_notes TEXT,
  diagnosis TEXT NOT NULL,
  treatment TEXT NOT NULL,
  treatment_notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (patient_id) REFERENCES patients(id),
  FOREIGN KEY (doctor_id) REFERENCES users(id)
); 