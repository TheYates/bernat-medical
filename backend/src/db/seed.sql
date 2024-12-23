-- Password will be "admin123" (hashed)
INSERT INTO users (username, password, full_name, role) 
VALUES (
  'admin',
  '$2b$10$36KJ.JigEvnvn9LxEhHG1OYpZe/oRUEMX.m5/VpXvHY0bqgWp9dIi', -- hashed 'admin123'
  'System Administrator',
  'admin'
); 

-- Update admin user with access
UPDATE users 
SET access = JSON_ARRAY('appointments', 'records', 'settings')
WHERE username = 'admin';