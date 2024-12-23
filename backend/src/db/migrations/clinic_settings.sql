CREATE TABLE IF NOT EXISTS clinic_settings (
    id INT AUTO_INCREMENT PRIMARY KEY,
    clinic_name VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL,
    phone VARCHAR(50) NOT NULL,
    address TEXT NOT NULL,
    id_prefix VARCHAR(5) NOT NULL DEFAULT 'CLN',
    starting_number INT NOT NULL DEFAULT 1,
    digit_length INT NOT NULL DEFAULT 6,
    last_number INT NOT NULL DEFAULT 0,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Insert default settings if not exists
INSERT INTO clinic_settings (
    clinic_name, 
    email, 
    phone, 
    address
) VALUES (
    'My Clinic',
    'clinic@example.com',
    '1234567890',
    'Clinic Address'
) ON DUPLICATE KEY UPDATE id = id; 