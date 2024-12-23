DROP TABLE IF EXISTS drug_insurance_markups;
DROP TABLE IF EXISTS insurance_companies;

CREATE TABLE insurance_companies (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    markup_decimal DECIMAL(4,2) NOT NULL DEFAULT 0.00,
    contact_person VARCHAR(100),
    phone VARCHAR(20),
    email VARCHAR(100),
    active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE drug_insurance_markups (
    id INT AUTO_INCREMENT PRIMARY KEY,
    drug_id INT NOT NULL,
    insurance_id INT NOT NULL,
    markup_decimal DECIMAL(4,2) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (drug_id) REFERENCES drugs(id),
    FOREIGN KEY (insurance_id) REFERENCES insurance_companies(id),
    UNIQUE KEY unique_drug_insurance (drug_id, insurance_id)
); 