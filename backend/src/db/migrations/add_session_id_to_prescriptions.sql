ALTER TABLE prescriptions 
ADD COLUMN session_id INT AFTER id,
ADD INDEX idx_session_id (session_id);

-- Update existing prescriptions to use their ID as session_id
UPDATE prescriptions 
SET session_id = id
WHERE session_id IS NULL; 