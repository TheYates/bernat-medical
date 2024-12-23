-- Audit log table
CREATE TABLE audit_log (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    action_type VARCHAR(50) NOT NULL,
    entity_type VARCHAR(50) NOT NULL,
    entity_id INT NOT NULL,
    details JSON,
    ip_address VARCHAR(45),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
);

-- Drug categories table
CREATE TABLE drug_categories (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Drug forms table
CREATE TABLE IF NOT EXISTS drug_forms (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Insert some default forms if needed
INSERT INTO drug_forms (name) VALUES 
('Box'),
('Pack'),
('Strip'),
('Tablet'),
('Bottle'),
('Tube'),
('Container'),
('Piece'),
('Ampoule'),
('Vial');

-- New drugs table structure
CREATE TABLE drugs (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    category_id INT NOT NULL,
    purchase_form_id INT NOT NULL,
    sale_form_id INT NOT NULL,
    
    -- Purchase details
    purchase_price DECIMAL(10, 2) NOT NULL,
    units_per_purchase INT NOT NULL,
    
    -- Pricing details
    pos_markup DECIMAL(5, 2) NOT NULL,
    prescription_markup DECIMAL(5, 2) NOT NULL,
    unit_cost DECIMAL(10, 2) NOT NULL,
    pos_price DECIMAL(10, 2) NOT NULL,
    prescription_price DECIMAL(10, 2) NOT NULL,
    
    -- Drug details
    strength VARCHAR(50) NOT NULL,
    unit VARCHAR(20) NOT NULL,
    min_stock INT NOT NULL DEFAULT 10,
    stock INT NOT NULL DEFAULT 0,
    expiry_date DATE NOT NULL,
    active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (category_id) REFERENCES drug_categories(id),
    FOREIGN KEY (purchase_form_id) REFERENCES drug_forms(id),
    FOREIGN KEY (sale_form_id) REFERENCES drug_forms(id)
);

-- New stock transactions table
CREATE TABLE stock_transactions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    drug_id INT NOT NULL,
    type ENUM('in', 'out') NOT NULL,
    purchase_quantity INT NOT NULL COMMENT 'Number of boxes/packs',
    sale_quantity INT NOT NULL COMMENT 'Number of strips/tablets',
    batch_number VARCHAR(50),
    expiry_date DATE,
    notes TEXT,
    created_by INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (drug_id) REFERENCES drugs(id),
    FOREIGN KEY (created_by) REFERENCES users(id)
);

-- Keep existing default categories
INSERT INTO drug_categories (name) VALUES 
('Antibiotics'),
('Painkillers'),
('Vitamins'),
('Antihypertensive'),
('Antidiabetic');

-- Keep existing default forms
INSERT INTO drug_forms (name) VALUES 
('Box'),
('Pack'),
('Strip'),
('Tablet'),
('Bottle'),
('Tube'),
('Container'),
('Piece'),
('Ampoule'),
('Vial');

-- Test query for low stock
SELECT 
  d.id,
  d.name,
  dc.name as category,
  sf.name as form,
  d.strength,
  d.unit,
  d.stock,
  d.min_stock as minStock
FROM drugs d
JOIN drug_categories dc ON d.category_id = dc.id
JOIN drug_forms sf ON d.sale_form_id = sf.id
WHERE d.stock <= d.min_stock 
  AND d.active = true
ORDER BY d.stock ASC;
  
ALTER TABLE stock_transactions
ADD COLUMN vendor_id INT,
ADD FOREIGN KEY (vendor_id) REFERENCES vendors(id);
  
-- Vendors table
CREATE TABLE IF NOT EXISTS vendors (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    contact_person VARCHAR(100),
    phone VARCHAR(20),
    email VARCHAR(100),
    address TEXT,
    active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Add some sample vendors
INSERT INTO vendors (name, contact_person, phone) VALUES 
('PharmaCare Ltd', 'John Doe', '+254700000000'),
('MediSupply Co', 'Jane Smith', '+254711111111'),
('HealthPlus Distributors', 'Bob Johnson', '+254722222222');
  
ALTER TABLE stock_transactions
ADD COLUMN reference_number VARCHAR(100);
  
ALTER TABLE stock_transactions
ADD COLUMN status ENUM('pending', 'approved', 'rejected') DEFAULT 'pending',
ADD COLUMN approved_by INT NULL,
ADD COLUMN approved_at TIMESTAMP NULL,
ADD FOREIGN KEY (approved_by) REFERENCES users(id);
  
-- Update stock_transactions table to include timestamps
ALTER TABLE stock_transactions
MODIFY created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN approved_at TIMESTAMP NULL;
  