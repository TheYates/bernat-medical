CREATE TABLE settings (
    id INT AUTO_INCREMENT PRIMARY KEY,
    key VARCHAR(50) UNIQUE NOT NULL,
    value JSON NOT NULL,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Insert default clinic ID settings
INSERT INTO settings (key, value) VALUES (
    'clinic_id_format',
    JSON_OBJECT(
        'idPrefix', 'CLN',
        'startingNumber', 1,
        'digitLength', 6,
        'lastNumber', 0
    )
); 