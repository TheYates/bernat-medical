CREATE TABLE patients (
  id INT AUTO_INCREMENT PRIMARY KEY,
  clinic_id VARCHAR(20) UNIQUE NOT NULL,
  first_name VARCHAR(100) NOT NULL,
  middle_name VARCHAR(100) NOT NULL,
  last_name VARCHAR(100) NOT NULL,
  date_of_birth DATE NOT NULL,
  gender ENUM('Male', 'Female') NOT NULL,
  contact VARCHAR(20) NOT NULL,
  marital_status VARCHAR(20),
  residence VARCHAR(255),
  emergency_contact_name VARCHAR(100),
  emergency_contact_number VARCHAR(20),
  emergency_contact_relation VARCHAR(50),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
); 