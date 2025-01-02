-- Base payments table
CREATE TABLE payments (
    id INT AUTO_INCREMENT PRIMARY KEY,
    method ENUM('card', 'cash', 'mobile', 'insurance') NOT NULL,
    amount DECIMAL(10,2) NOT NULL,
    recorded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    recorded_by INT NOT NULL,
    FOREIGN KEY (recorded_by) REFERENCES users(id)
);

-- Prescription payments junction table
CREATE TABLE prescription_payments (
    prescription_id INT NOT NULL,
    payment_id INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (prescription_id, payment_id),
    FOREIGN KEY (prescription_id) REFERENCES prescriptions(id),
    FOREIGN KEY (payment_id) REFERENCES payments(id)
);

-- Update prescriptions table to track dispensing
ALTER TABLE prescriptions
ADD COLUMN dispensed BOOLEAN DEFAULT false,
ADD COLUMN dispensed_by INT,
ADD COLUMN dispensed_at TIMESTAMP NULL,
ADD FOREIGN KEY (dispensed_by) REFERENCES users(id);

-- Create prescriptions table if not exists
CREATE TABLE IF NOT EXISTS prescriptions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    patient_id INT NOT NULL,
    drug_id INT NOT NULL,
    dosage VARCHAR(100) NOT NULL,
    frequency VARCHAR(100) NOT NULL,
    duration VARCHAR(100) NOT NULL,
    quantity INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (patient_id) REFERENCES patients(id),
    FOREIGN KEY (drug_id) REFERENCES drugs(id)
); 