-- First drop the existing foreign key constraints if they exist
SET @constraint_name = (
  SELECT CONSTRAINT_NAME 
  FROM information_schema.KEY_COLUMN_USAGE 
  WHERE TABLE_NAME = 'drugs' 
  AND COLUMN_NAME = 'form_id' 
  AND CONSTRAINT_NAME = 'drugs_ibfk_2'
);

SET @sql = IF(@constraint_name IS NOT NULL, 
  'ALTER TABLE drugs DROP FOREIGN KEY drugs_ibfk_2',
  'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- First drop old columns
ALTER TABLE drugs
DROP COLUMN markup,
DROP COLUMN sale_price;

-- Then add all new columns in one statement
ALTER TABLE drugs
ADD COLUMN purchase_form_id INT NOT NULL AFTER category_id,
ADD COLUMN sale_form_id INT NOT NULL AFTER purchase_form_id,
ADD COLUMN purchase_price DECIMAL(10, 2) NOT NULL,
ADD COLUMN units_per_purchase INT NOT NULL,
ADD COLUMN pos_markup DECIMAL(5, 2) NOT NULL,
ADD COLUMN prescription_markup DECIMAL(5, 2) NOT NULL,
ADD COLUMN unit_cost DECIMAL(10, 2) NOT NULL,
ADD COLUMN pos_price DECIMAL(10, 2) NOT NULL,
ADD COLUMN prescription_price DECIMAL(10, 2) NOT NULL,
ADD FOREIGN KEY (purchase_form_id) REFERENCES drug_forms(id),
ADD FOREIGN KEY (sale_form_id) REFERENCES drug_forms(id);

-- Update stock_transactions table
ALTER TABLE stock_transactions
DROP COLUMN quantity,
ADD COLUMN purchase_quantity INT COMMENT 'Number of boxes/packs' AFTER type,
ADD COLUMN sale_quantity INT COMMENT 'Number of strips/tablets' AFTER purchase_quantity;