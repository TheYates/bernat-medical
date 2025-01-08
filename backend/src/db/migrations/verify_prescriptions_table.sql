-- Show the current table structure
SHOW CREATE TABLE prescriptions;

-- Verify constraints
SELECT 
    COLUMN_NAME, 
    DATA_TYPE, 
    IS_NULLABLE, 
    COLUMN_DEFAULT
FROM 
    INFORMATION_SCHEMA.COLUMNS
WHERE 
    TABLE_NAME = 'prescriptions'; 