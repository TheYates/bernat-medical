-- Base payments table for common fields
CREATE TABLE payments (
    id INT AUTO_INCREMENT PRIMARY KEY,
    method ENUM('card', 'cash', 'mobile', 'insurance') NOT NULL,
    amount DECIMAL(10,2) NOT NULL,
    recorded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    recorded_by INT NOT NULL,
    FOREIGN KEY (recorded_by) REFERENCES users(id)
);

-- Prescription payments
CREATE TABLE prescription_payments (
    prescription_id INT NOT NULL,
    payment_id INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (prescription_id, payment_id),
    FOREIGN KEY (prescription_id) REFERENCES prescriptions(id),
    FOREIGN KEY (payment_id) REFERENCES payments(id)
);

-- Service request payments
CREATE TABLE service_request_payments (
    request_id INT NOT NULL,
    payment_id INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (request_id, payment_id),
    FOREIGN KEY (request_id) REFERENCES service_requests(id),
    FOREIGN KEY (payment_id) REFERENCES payments(id)
);

-- POS/OTC payments
CREATE TABLE pos_payments (
    transaction_id INT NOT NULL,
    payment_id INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (transaction_id, payment_id),
    FOREIGN KEY (transaction_id) REFERENCES pos_transactions(id),
    FOREIGN KEY (payment_id) REFERENCES payments(id)
);

-- Lab test payments
CREATE TABLE lab_test_payments (
    test_id INT NOT NULL,
    payment_id INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (test_id, payment_id),
    FOREIGN KEY (test_id) REFERENCES lab_tests(id),
    FOREIGN KEY (payment_id) REFERENCES payments(id)
); 