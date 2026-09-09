-- ==============================================================================
-- SCRIPT DE INICIALIZACIÓN DE BASE DE DATOS MÚLTIPLES (Database-per-Service)
-- ==============================================================================

CREATE DATABASE auth_db;
CREATE DATABASE graduates_db;
CREATE DATABASE companies_db;
CREATE DATABASE matchmaking_db;

-- ------------------------------------------------------------------------------
-- AUTH DB
-- ------------------------------------------------------------------------------
\c auth_db

CREATE TABLE roles (
    id SERIAL PRIMARY KEY,
    name VARCHAR(50) UNIQUE NOT NULL
);

CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role_id INT REFERENCES roles(id) ON DELETE RESTRICT,
    is_active BOOLEAN DEFAULT TRUE,
    email_verified BOOLEAN DEFAULT FALSE,
    verification_token VARCHAR(255),
    password_reset_pin VARCHAR(10),
    pin_expires_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE notifications (
    id SERIAL PRIMARY KEY,
    user_id INT REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    type VARCHAR(50),
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO roles (name) VALUES ('ADMIN'), ('COMPANY'), ('GRADUATE');
INSERT INTO users (email, password_hash, role_id, email_verified) VALUES 
('admin@portal.com', '$2b$12$W/HM61gptgvPPlpJE3dGHeyYemYAD135TuJ50RZTVLox06R6kuEba', 1, TRUE),
('empresa@ejemplo.com', '$2b$12$W/HM61gptgvPPlpJE3dGHeyYemYAD135TuJ50RZTVLox06R6kuEba', 2, TRUE),
('egresado@unicesar.edu.co', '$2b$12$W/HM61gptgvPPlpJE3dGHeyYemYAD135TuJ50RZTVLox06R6kuEba', 3, TRUE);
INSERT INTO users (email, password_hash, role_id, email_verified) VALUES
('empresa4@ejemplo.com', '$2b$12$W/HM61gptgvPPlpJE3dGHeyYemYAD135TuJ50RZTVLox06R6kuEba', 2, TRUE),
('empresa5@ejemplo.com', '$2b$12$W/HM61gptgvPPlpJE3dGHeyYemYAD135TuJ50RZTVLox06R6kuEba', 2, TRUE),
('empresa6@ejemplo.com', '$2b$12$W/HM61gptgvPPlpJE3dGHeyYemYAD135TuJ50RZTVLox06R6kuEba', 2, TRUE),
('empresa7@ejemplo.com', '$2b$12$W/HM61gptgvPPlpJE3dGHeyYemYAD135TuJ50RZTVLox06R6kuEba', 2, TRUE),
('empresa8@ejemplo.com', '$2b$12$W/HM61gptgvPPlpJE3dGHeyYemYAD135TuJ50RZTVLox06R6kuEba', 2, TRUE),
('empresa9@ejemplo.com', '$2b$12$W/HM61gptgvPPlpJE3dGHeyYemYAD135TuJ50RZTVLox06R6kuEba', 2, TRUE),
('empresa10@ejemplo.com', '$2b$12$W/HM61gptgvPPlpJE3dGHeyYemYAD135TuJ50RZTVLox06R6kuEba', 2, TRUE),
('empresa11@ejemplo.com', '$2b$12$W/HM61gptgvPPlpJE3dGHeyYemYAD135TuJ50RZTVLox06R6kuEba', 2, TRUE),
('empresa12@ejemplo.com', '$2b$12$W/HM61gptgvPPlpJE3dGHeyYemYAD135TuJ50RZTVLox06R6kuEba', 2, TRUE),
('empresa13@ejemplo.com', '$2b$12$W/HM61gptgvPPlpJE3dGHeyYemYAD135TuJ50RZTVLox06R6kuEba', 2, TRUE),
('empresa14@ejemplo.com', '$2b$12$W/HM61gptgvPPlpJE3dGHeyYemYAD135TuJ50RZTVLox06R6kuEba', 2, TRUE),
('empresa15@ejemplo.com', '$2b$12$W/HM61gptgvPPlpJE3dGHeyYemYAD135TuJ50RZTVLox06R6kuEba', 2, TRUE),
('empresa16@ejemplo.com', '$2b$12$W/HM61gptgvPPlpJE3dGHeyYemYAD135TuJ50RZTVLox06R6kuEba', 2, TRUE),
('empresa17@ejemplo.com', '$2b$12$W/HM61gptgvPPlpJE3dGHeyYemYAD135TuJ50RZTVLox06R6kuEba', 2, TRUE),
('empresa18@ejemplo.com', '$2b$12$W/HM61gptgvPPlpJE3dGHeyYemYAD135TuJ50RZTVLox06R6kuEba', 2, TRUE),
('empresa19@ejemplo.com', '$2b$12$W/HM61gptgvPPlpJE3dGHeyYemYAD135TuJ50RZTVLox06R6kuEba', 2, TRUE),
('empresa20@ejemplo.com', '$2b$12$W/HM61gptgvPPlpJE3dGHeyYemYAD135TuJ50RZTVLox06R6kuEba', 2, TRUE),
('empresa21@ejemplo.com', '$2b$12$W/HM61gptgvPPlpJE3dGHeyYemYAD135TuJ50RZTVLox06R6kuEba', 2, TRUE),
('empresa22@ejemplo.com', '$2b$12$W/HM61gptgvPPlpJE3dGHeyYemYAD135TuJ50RZTVLox06R6kuEba', 2, TRUE),
('empresa23@ejemplo.com', '$2b$12$W/HM61gptgvPPlpJE3dGHeyYemYAD135TuJ50RZTVLox06R6kuEba', 2, TRUE),
('empresa24@ejemplo.com', '$2b$12$W/HM61gptgvPPlpJE3dGHeyYemYAD135TuJ50RZTVLox06R6kuEba', 2, TRUE),
('empresa25@ejemplo.com', '$2b$12$W/HM61gptgvPPlpJE3dGHeyYemYAD135TuJ50RZTVLox06R6kuEba', 2, TRUE),
('empresa26@ejemplo.com', '$2b$12$W/HM61gptgvPPlpJE3dGHeyYemYAD135TuJ50RZTVLox06R6kuEba', 2, TRUE),
('empresa27@ejemplo.com', '$2b$12$W/HM61gptgvPPlpJE3dGHeyYemYAD135TuJ50RZTVLox06R6kuEba', 2, TRUE),
('empresa28@ejemplo.com', '$2b$12$W/HM61gptgvPPlpJE3dGHeyYemYAD135TuJ50RZTVLox06R6kuEba', 2, TRUE),
('empresa29@ejemplo.com', '$2b$12$W/HM61gptgvPPlpJE3dGHeyYemYAD135TuJ50RZTVLox06R6kuEba', 2, TRUE),
('empresa30@ejemplo.com', '$2b$12$W/HM61gptgvPPlpJE3dGHeyYemYAD135TuJ50RZTVLox06R6kuEba', 2, TRUE),
('empresa31@ejemplo.com', '$2b$12$W/HM61gptgvPPlpJE3dGHeyYemYAD135TuJ50RZTVLox06R6kuEba', 2, TRUE),
('empresa32@ejemplo.com', '$2b$12$W/HM61gptgvPPlpJE3dGHeyYemYAD135TuJ50RZTVLox06R6kuEba', 2, TRUE),
('empresa33@ejemplo.com', '$2b$12$W/HM61gptgvPPlpJE3dGHeyYemYAD135TuJ50RZTVLox06R6kuEba', 2, TRUE),
('empresa34@ejemplo.com', '$2b$12$W/HM61gptgvPPlpJE3dGHeyYemYAD135TuJ50RZTVLox06R6kuEba', 2, TRUE),
('empresa35@ejemplo.com', '$2b$12$W/HM61gptgvPPlpJE3dGHeyYemYAD135TuJ50RZTVLox06R6kuEba', 2, TRUE),
('empresa36@ejemplo.com', '$2b$12$W/HM61gptgvPPlpJE3dGHeyYemYAD135TuJ50RZTVLox06R6kuEba', 2, TRUE),
('empresa37@ejemplo.com', '$2b$12$W/HM61gptgvPPlpJE3dGHeyYemYAD135TuJ50RZTVLox06R6kuEba', 2, TRUE),
('empresa38@ejemplo.com', '$2b$12$W/HM61gptgvPPlpJE3dGHeyYemYAD135TuJ50RZTVLox06R6kuEba', 2, TRUE),
('empresa39@ejemplo.com', '$2b$12$W/HM61gptgvPPlpJE3dGHeyYemYAD135TuJ50RZTVLox06R6kuEba', 2, TRUE),
('empresa40@ejemplo.com', '$2b$12$W/HM61gptgvPPlpJE3dGHeyYemYAD135TuJ50RZTVLox06R6kuEba', 2, TRUE),
('empresa41@ejemplo.com', '$2b$12$W/HM61gptgvPPlpJE3dGHeyYemYAD135TuJ50RZTVLox06R6kuEba', 2, TRUE),
('empresa42@ejemplo.com', '$2b$12$W/HM61gptgvPPlpJE3dGHeyYemYAD135TuJ50RZTVLox06R6kuEba', 2, TRUE),
('empresa43@ejemplo.com', '$2b$12$W/HM61gptgvPPlpJE3dGHeyYemYAD135TuJ50RZTVLox06R6kuEba', 2, TRUE);
INSERT INTO users (email, password_hash, role_id, email_verified) VALUES
('egresado44@unicesar.edu.co', '$2b$12$W/HM61gptgvPPlpJE3dGHeyYemYAD135TuJ50RZTVLox06R6kuEba', 3, TRUE),
('egresado45@unicesar.edu.co', '$2b$12$W/HM61gptgvPPlpJE3dGHeyYemYAD135TuJ50RZTVLox06R6kuEba', 3, TRUE),
('egresado46@unicesar.edu.co', '$2b$12$W/HM61gptgvPPlpJE3dGHeyYemYAD135TuJ50RZTVLox06R6kuEba', 3, TRUE),
('egresado47@unicesar.edu.co', '$2b$12$W/HM61gptgvPPlpJE3dGHeyYemYAD135TuJ50RZTVLox06R6kuEba', 3, TRUE),
('egresado48@unicesar.edu.co', '$2b$12$W/HM61gptgvPPlpJE3dGHeyYemYAD135TuJ50RZTVLox06R6kuEba', 3, TRUE),
('egresado49@unicesar.edu.co', '$2b$12$W/HM61gptgvPPlpJE3dGHeyYemYAD135TuJ50RZTVLox06R6kuEba', 3, TRUE),
('egresado50@unicesar.edu.co', '$2b$12$W/HM61gptgvPPlpJE3dGHeyYemYAD135TuJ50RZTVLox06R6kuEba', 3, TRUE),
('egresado51@unicesar.edu.co', '$2b$12$W/HM61gptgvPPlpJE3dGHeyYemYAD135TuJ50RZTVLox06R6kuEba', 3, TRUE),
('egresado52@unicesar.edu.co', '$2b$12$W/HM61gptgvPPlpJE3dGHeyYemYAD135TuJ50RZTVLox06R6kuEba', 3, TRUE),
('egresado53@unicesar.edu.co', '$2b$12$W/HM61gptgvPPlpJE3dGHeyYemYAD135TuJ50RZTVLox06R6kuEba', 3, TRUE),
('egresado54@unicesar.edu.co', '$2b$12$W/HM61gptgvPPlpJE3dGHeyYemYAD135TuJ50RZTVLox06R6kuEba', 3, TRUE),
('egresado55@unicesar.edu.co', '$2b$12$W/HM61gptgvPPlpJE3dGHeyYemYAD135TuJ50RZTVLox06R6kuEba', 3, TRUE),
('egresado56@unicesar.edu.co', '$2b$12$W/HM61gptgvPPlpJE3dGHeyYemYAD135TuJ50RZTVLox06R6kuEba', 3, TRUE),
('egresado57@unicesar.edu.co', '$2b$12$W/HM61gptgvPPlpJE3dGHeyYemYAD135TuJ50RZTVLox06R6kuEba', 3, TRUE),
('egresado58@unicesar.edu.co', '$2b$12$W/HM61gptgvPPlpJE3dGHeyYemYAD135TuJ50RZTVLox06R6kuEba', 3, TRUE),
('egresado59@unicesar.edu.co', '$2b$12$W/HM61gptgvPPlpJE3dGHeyYemYAD135TuJ50RZTVLox06R6kuEba', 3, TRUE),
('egresado60@unicesar.edu.co', '$2b$12$W/HM61gptgvPPlpJE3dGHeyYemYAD135TuJ50RZTVLox06R6kuEba', 3, TRUE),
('egresado61@unicesar.edu.co', '$2b$12$W/HM61gptgvPPlpJE3dGHeyYemYAD135TuJ50RZTVLox06R6kuEba', 3, TRUE),
('egresado62@unicesar.edu.co', '$2b$12$W/HM61gptgvPPlpJE3dGHeyYemYAD135TuJ50RZTVLox06R6kuEba', 3, TRUE),
('egresado63@unicesar.edu.co', '$2b$12$W/HM61gptgvPPlpJE3dGHeyYemYAD135TuJ50RZTVLox06R6kuEba', 3, TRUE),
('egresado64@unicesar.edu.co', '$2b$12$W/HM61gptgvPPlpJE3dGHeyYemYAD135TuJ50RZTVLox06R6kuEba', 3, TRUE),
('egresado65@unicesar.edu.co', '$2b$12$W/HM61gptgvPPlpJE3dGHeyYemYAD135TuJ50RZTVLox06R6kuEba', 3, TRUE),
('egresado66@unicesar.edu.co', '$2b$12$W/HM61gptgvPPlpJE3dGHeyYemYAD135TuJ50RZTVLox06R6kuEba', 3, TRUE),
('egresado67@unicesar.edu.co', '$2b$12$W/HM61gptgvPPlpJE3dGHeyYemYAD135TuJ50RZTVLox06R6kuEba', 3, TRUE),
('egresado68@unicesar.edu.co', '$2b$12$W/HM61gptgvPPlpJE3dGHeyYemYAD135TuJ50RZTVLox06R6kuEba', 3, TRUE),
('egresado69@unicesar.edu.co', '$2b$12$W/HM61gptgvPPlpJE3dGHeyYemYAD135TuJ50RZTVLox06R6kuEba', 3, TRUE),
('egresado70@unicesar.edu.co', '$2b$12$W/HM61gptgvPPlpJE3dGHeyYemYAD135TuJ50RZTVLox06R6kuEba', 3, TRUE),
('egresado71@unicesar.edu.co', '$2b$12$W/HM61gptgvPPlpJE3dGHeyYemYAD135TuJ50RZTVLox06R6kuEba', 3, TRUE),
('egresado72@unicesar.edu.co', '$2b$12$W/HM61gptgvPPlpJE3dGHeyYemYAD135TuJ50RZTVLox06R6kuEba', 3, TRUE),
('egresado73@unicesar.edu.co', '$2b$12$W/HM61gptgvPPlpJE3dGHeyYemYAD135TuJ50RZTVLox06R6kuEba', 3, TRUE),
('egresado74@unicesar.edu.co', '$2b$12$W/HM61gptgvPPlpJE3dGHeyYemYAD135TuJ50RZTVLox06R6kuEba', 3, TRUE),
('egresado75@unicesar.edu.co', '$2b$12$W/HM61gptgvPPlpJE3dGHeyYemYAD135TuJ50RZTVLox06R6kuEba', 3, TRUE),
('egresado76@unicesar.edu.co', '$2b$12$W/HM61gptgvPPlpJE3dGHeyYemYAD135TuJ50RZTVLox06R6kuEba', 3, TRUE),
('egresado77@unicesar.edu.co', '$2b$12$W/HM61gptgvPPlpJE3dGHeyYemYAD135TuJ50RZTVLox06R6kuEba', 3, TRUE),
('egresado78@unicesar.edu.co', '$2b$12$W/HM61gptgvPPlpJE3dGHeyYemYAD135TuJ50RZTVLox06R6kuEba', 3, TRUE),
('egresado79@unicesar.edu.co', '$2b$12$W/HM61gptgvPPlpJE3dGHeyYemYAD135TuJ50RZTVLox06R6kuEba', 3, TRUE),
('egresado80@unicesar.edu.co', '$2b$12$W/HM61gptgvPPlpJE3dGHeyYemYAD135TuJ50RZTVLox06R6kuEba', 3, TRUE),
('egresado81@unicesar.edu.co', '$2b$12$W/HM61gptgvPPlpJE3dGHeyYemYAD135TuJ50RZTVLox06R6kuEba', 3, TRUE),
('egresado82@unicesar.edu.co', '$2b$12$W/HM61gptgvPPlpJE3dGHeyYemYAD135TuJ50RZTVLox06R6kuEba', 3, TRUE),
('egresado83@unicesar.edu.co', '$2b$12$W/HM61gptgvPPlpJE3dGHeyYemYAD135TuJ50RZTVLox06R6kuEba', 3, TRUE),
('egresado84@unicesar.edu.co', '$2b$12$W/HM61gptgvPPlpJE3dGHeyYemYAD135TuJ50RZTVLox06R6kuEba', 3, TRUE),
('egresado85@unicesar.edu.co', '$2b$12$W/HM61gptgvPPlpJE3dGHeyYemYAD135TuJ50RZTVLox06R6kuEba', 3, TRUE),
('egresado86@unicesar.edu.co', '$2b$12$W/HM61gptgvPPlpJE3dGHeyYemYAD135TuJ50RZTVLox06R6kuEba', 3, TRUE),
('egresado87@unicesar.edu.co', '$2b$12$W/HM61gptgvPPlpJE3dGHeyYemYAD135TuJ50RZTVLox06R6kuEba', 3, TRUE),
('egresado88@unicesar.edu.co', '$2b$12$W/HM61gptgvPPlpJE3dGHeyYemYAD135TuJ50RZTVLox06R6kuEba', 3, TRUE),
('egresado89@unicesar.edu.co', '$2b$12$W/HM61gptgvPPlpJE3dGHeyYemYAD135TuJ50RZTVLox06R6kuEba', 3, TRUE),
('egresado90@unicesar.edu.co', '$2b$12$W/HM61gptgvPPlpJE3dGHeyYemYAD135TuJ50RZTVLox06R6kuEba', 3, TRUE),
('egresado91@unicesar.edu.co', '$2b$12$W/HM61gptgvPPlpJE3dGHeyYemYAD135TuJ50RZTVLox06R6kuEba', 3, TRUE),
('egresado92@unicesar.edu.co', '$2b$12$W/HM61gptgvPPlpJE3dGHeyYemYAD135TuJ50RZTVLox06R6kuEba', 3, TRUE),
('egresado93@unicesar.edu.co', '$2b$12$W/HM61gptgvPPlpJE3dGHeyYemYAD135TuJ50RZTVLox06R6kuEba', 3, TRUE),
('egresado94@unicesar.edu.co', '$2b$12$W/HM61gptgvPPlpJE3dGHeyYemYAD135TuJ50RZTVLox06R6kuEba', 3, TRUE),
('egresado95@unicesar.edu.co', '$2b$12$W/HM61gptgvPPlpJE3dGHeyYemYAD135TuJ50RZTVLox06R6kuEba', 3, TRUE),
('egresado96@unicesar.edu.co', '$2b$12$W/HM61gptgvPPlpJE3dGHeyYemYAD135TuJ50RZTVLox06R6kuEba', 3, TRUE),
('egresado97@unicesar.edu.co', '$2b$12$W/HM61gptgvPPlpJE3dGHeyYemYAD135TuJ50RZTVLox06R6kuEba', 3, TRUE),
('egresado98@unicesar.edu.co', '$2b$12$W/HM61gptgvPPlpJE3dGHeyYemYAD135TuJ50RZTVLox06R6kuEba', 3, TRUE),
('egresado99@unicesar.edu.co', '$2b$12$W/HM61gptgvPPlpJE3dGHeyYemYAD135TuJ50RZTVLox06R6kuEba', 3, TRUE),
('egresado100@unicesar.edu.co', '$2b$12$W/HM61gptgvPPlpJE3dGHeyYemYAD135TuJ50RZTVLox06R6kuEba', 3, TRUE),
('egresado101@unicesar.edu.co', '$2b$12$W/HM61gptgvPPlpJE3dGHeyYemYAD135TuJ50RZTVLox06R6kuEba', 3, TRUE),
('egresado102@unicesar.edu.co', '$2b$12$W/HM61gptgvPPlpJE3dGHeyYemYAD135TuJ50RZTVLox06R6kuEba', 3, TRUE),
('egresado103@unicesar.edu.co', '$2b$12$W/HM61gptgvPPlpJE3dGHeyYemYAD135TuJ50RZTVLox06R6kuEba', 3, TRUE),
('egresado104@unicesar.edu.co', '$2b$12$W/HM61gptgvPPlpJE3dGHeyYemYAD135TuJ50RZTVLox06R6kuEba', 3, TRUE),
('egresado105@unicesar.edu.co', '$2b$12$W/HM61gptgvPPlpJE3dGHeyYemYAD135TuJ50RZTVLox06R6kuEba', 3, TRUE),
('egresado106@unicesar.edu.co', '$2b$12$W/HM61gptgvPPlpJE3dGHeyYemYAD135TuJ50RZTVLox06R6kuEba', 3, TRUE),
('egresado107@unicesar.edu.co', '$2b$12$W/HM61gptgvPPlpJE3dGHeyYemYAD135TuJ50RZTVLox06R6kuEba', 3, TRUE),
('egresado108@unicesar.edu.co', '$2b$12$W/HM61gptgvPPlpJE3dGHeyYemYAD135TuJ50RZTVLox06R6kuEba', 3, TRUE),
('egresado109@unicesar.edu.co', '$2b$12$W/HM61gptgvPPlpJE3dGHeyYemYAD135TuJ50RZTVLox06R6kuEba', 3, TRUE),
('egresado110@unicesar.edu.co', '$2b$12$W/HM61gptgvPPlpJE3dGHeyYemYAD135TuJ50RZTVLox06R6kuEba', 3, TRUE),
('egresado111@unicesar.edu.co', '$2b$12$W/HM61gptgvPPlpJE3dGHeyYemYAD135TuJ50RZTVLox06R6kuEba', 3, TRUE),
('egresado112@unicesar.edu.co', '$2b$12$W/HM61gptgvPPlpJE3dGHeyYemYAD135TuJ50RZTVLox06R6kuEba', 3, TRUE),
('egresado113@unicesar.edu.co', '$2b$12$W/HM61gptgvPPlpJE3dGHeyYemYAD135TuJ50RZTVLox06R6kuEba', 3, TRUE),
('egresado114@unicesar.edu.co', '$2b$12$W/HM61gptgvPPlpJE3dGHeyYemYAD135TuJ50RZTVLox06R6kuEba', 3, TRUE),
('egresado115@unicesar.edu.co', '$2b$12$W/HM61gptgvPPlpJE3dGHeyYemYAD135TuJ50RZTVLox06R6kuEba', 3, TRUE),
('egresado116@unicesar.edu.co', '$2b$12$W/HM61gptgvPPlpJE3dGHeyYemYAD135TuJ50RZTVLox06R6kuEba', 3, TRUE),
('egresado117@unicesar.edu.co', '$2b$12$W/HM61gptgvPPlpJE3dGHeyYemYAD135TuJ50RZTVLox06R6kuEba', 3, TRUE),
('egresado118@unicesar.edu.co', '$2b$12$W/HM61gptgvPPlpJE3dGHeyYemYAD135TuJ50RZTVLox06R6kuEba', 3, TRUE),
('egresado119@unicesar.edu.co', '$2b$12$W/HM61gptgvPPlpJE3dGHeyYemYAD135TuJ50RZTVLox06R6kuEba', 3, TRUE),
('egresado120@unicesar.edu.co', '$2b$12$W/HM61gptgvPPlpJE3dGHeyYemYAD135TuJ50RZTVLox06R6kuEba', 3, TRUE),
('egresado121@unicesar.edu.co', '$2b$12$W/HM61gptgvPPlpJE3dGHeyYemYAD135TuJ50RZTVLox06R6kuEba', 3, TRUE),
('egresado122@unicesar.edu.co', '$2b$12$W/HM61gptgvPPlpJE3dGHeyYemYAD135TuJ50RZTVLox06R6kuEba', 3, TRUE),
('egresado123@unicesar.edu.co', '$2b$12$W/HM61gptgvPPlpJE3dGHeyYemYAD135TuJ50RZTVLox06R6kuEba', 3, TRUE),
('egresado124@unicesar.edu.co', '$2b$12$W/HM61gptgvPPlpJE3dGHeyYemYAD135TuJ50RZTVLox06R6kuEba', 3, TRUE),
('egresado125@unicesar.edu.co', '$2b$12$W/HM61gptgvPPlpJE3dGHeyYemYAD135TuJ50RZTVLox06R6kuEba', 3, TRUE),
('egresado126@unicesar.edu.co', '$2b$12$W/HM61gptgvPPlpJE3dGHeyYemYAD135TuJ50RZTVLox06R6kuEba', 3, TRUE),
('egresado127@unicesar.edu.co', '$2b$12$W/HM61gptgvPPlpJE3dGHeyYemYAD135TuJ50RZTVLox06R6kuEba', 3, TRUE),
('egresado128@unicesar.edu.co', '$2b$12$W/HM61gptgvPPlpJE3dGHeyYemYAD135TuJ50RZTVLox06R6kuEba', 3, TRUE),
('egresado129@unicesar.edu.co', '$2b$12$W/HM61gptgvPPlpJE3dGHeyYemYAD135TuJ50RZTVLox06R6kuEba', 3, TRUE),
('egresado130@unicesar.edu.co', '$2b$12$W/HM61gptgvPPlpJE3dGHeyYemYAD135TuJ50RZTVLox06R6kuEba', 3, TRUE),
('egresado131@unicesar.edu.co', '$2b$12$W/HM61gptgvPPlpJE3dGHeyYemYAD135TuJ50RZTVLox06R6kuEba', 3, TRUE),
('egresado132@unicesar.edu.co', '$2b$12$W/HM61gptgvPPlpJE3dGHeyYemYAD135TuJ50RZTVLox06R6kuEba', 3, TRUE),
('egresado133@unicesar.edu.co', '$2b$12$W/HM61gptgvPPlpJE3dGHeyYemYAD135TuJ50RZTVLox06R6kuEba', 3, TRUE),
('egresado134@unicesar.edu.co', '$2b$12$W/HM61gptgvPPlpJE3dGHeyYemYAD135TuJ50RZTVLox06R6kuEba', 3, TRUE),
('egresado135@unicesar.edu.co', '$2b$12$W/HM61gptgvPPlpJE3dGHeyYemYAD135TuJ50RZTVLox06R6kuEba', 3, TRUE),
('egresado136@unicesar.edu.co', '$2b$12$W/HM61gptgvPPlpJE3dGHeyYemYAD135TuJ50RZTVLox06R6kuEba', 3, TRUE),
('egresado137@unicesar.edu.co', '$2b$12$W/HM61gptgvPPlpJE3dGHeyYemYAD135TuJ50RZTVLox06R6kuEba', 3, TRUE),
('egresado138@unicesar.edu.co', '$2b$12$W/HM61gptgvPPlpJE3dGHeyYemYAD135TuJ50RZTVLox06R6kuEba', 3, TRUE),
('egresado139@unicesar.edu.co', '$2b$12$W/HM61gptgvPPlpJE3dGHeyYemYAD135TuJ50RZTVLox06R6kuEba', 3, TRUE),
('egresado140@unicesar.edu.co', '$2b$12$W/HM61gptgvPPlpJE3dGHeyYemYAD135TuJ50RZTVLox06R6kuEba', 3, TRUE),
('egresado141@unicesar.edu.co', '$2b$12$W/HM61gptgvPPlpJE3dGHeyYemYAD135TuJ50RZTVLox06R6kuEba', 3, TRUE),
('egresado142@unicesar.edu.co', '$2b$12$W/HM61gptgvPPlpJE3dGHeyYemYAD135TuJ50RZTVLox06R6kuEba', 3, TRUE),
('egresado143@unicesar.edu.co', '$2b$12$W/HM61gptgvPPlpJE3dGHeyYemYAD135TuJ50RZTVLox06R6kuEba', 3, TRUE),
('egresado144@unicesar.edu.co', '$2b$12$W/HM61gptgvPPlpJE3dGHeyYemYAD135TuJ50RZTVLox06R6kuEba', 3, TRUE),
('egresado145@unicesar.edu.co', '$2b$12$W/HM61gptgvPPlpJE3dGHeyYemYAD135TuJ50RZTVLox06R6kuEba', 3, TRUE),
('egresado146@unicesar.edu.co', '$2b$12$W/HM61gptgvPPlpJE3dGHeyYemYAD135TuJ50RZTVLox06R6kuEba', 3, TRUE),
('egresado147@unicesar.edu.co', '$2b$12$W/HM61gptgvPPlpJE3dGHeyYemYAD135TuJ50RZTVLox06R6kuEba', 3, TRUE),
('egresado148@unicesar.edu.co', '$2b$12$W/HM61gptgvPPlpJE3dGHeyYemYAD135TuJ50RZTVLox06R6kuEba', 3, TRUE),
('egresado149@unicesar.edu.co', '$2b$12$W/HM61gptgvPPlpJE3dGHeyYemYAD135TuJ50RZTVLox06R6kuEba', 3, TRUE),
('egresado150@unicesar.edu.co', '$2b$12$W/HM61gptgvPPlpJE3dGHeyYemYAD135TuJ50RZTVLox06R6kuEba', 3, TRUE),
('egresado151@unicesar.edu.co', '$2b$12$W/HM61gptgvPPlpJE3dGHeyYemYAD135TuJ50RZTVLox06R6kuEba', 3, TRUE),
('egresado152@unicesar.edu.co', '$2b$12$W/HM61gptgvPPlpJE3dGHeyYemYAD135TuJ50RZTVLox06R6kuEba', 3, TRUE),
('egresado153@unicesar.edu.co', '$2b$12$W/HM61gptgvPPlpJE3dGHeyYemYAD135TuJ50RZTVLox06R6kuEba', 3, TRUE),
('egresado154@unicesar.edu.co', '$2b$12$W/HM61gptgvPPlpJE3dGHeyYemYAD135TuJ50RZTVLox06R6kuEba', 3, TRUE),
('egresado155@unicesar.edu.co', '$2b$12$W/HM61gptgvPPlpJE3dGHeyYemYAD135TuJ50RZTVLox06R6kuEba', 3, TRUE),
('egresado156@unicesar.edu.co', '$2b$12$W/HM61gptgvPPlpJE3dGHeyYemYAD135TuJ50RZTVLox06R6kuEba', 3, TRUE),
('egresado157@unicesar.edu.co', '$2b$12$W/HM61gptgvPPlpJE3dGHeyYemYAD135TuJ50RZTVLox06R6kuEba', 3, TRUE),
('egresado158@unicesar.edu.co', '$2b$12$W/HM61gptgvPPlpJE3dGHeyYemYAD135TuJ50RZTVLox06R6kuEba', 3, TRUE),
('egresado159@unicesar.edu.co', '$2b$12$W/HM61gptgvPPlpJE3dGHeyYemYAD135TuJ50RZTVLox06R6kuEba', 3, TRUE),
('egresado160@unicesar.edu.co', '$2b$12$W/HM61gptgvPPlpJE3dGHeyYemYAD135TuJ50RZTVLox06R6kuEba', 3, TRUE),
('egresado161@unicesar.edu.co', '$2b$12$W/HM61gptgvPPlpJE3dGHeyYemYAD135TuJ50RZTVLox06R6kuEba', 3, TRUE),
('egresado162@unicesar.edu.co', '$2b$12$W/HM61gptgvPPlpJE3dGHeyYemYAD135TuJ50RZTVLox06R6kuEba', 3, TRUE),
('egresado163@unicesar.edu.co', '$2b$12$W/HM61gptgvPPlpJE3dGHeyYemYAD135TuJ50RZTVLox06R6kuEba', 3, TRUE),
('egresado164@unicesar.edu.co', '$2b$12$W/HM61gptgvPPlpJE3dGHeyYemYAD135TuJ50RZTVLox06R6kuEba', 3, TRUE),
('egresado165@unicesar.edu.co', '$2b$12$W/HM61gptgvPPlpJE3dGHeyYemYAD135TuJ50RZTVLox06R6kuEba', 3, TRUE),
('egresado166@unicesar.edu.co', '$2b$12$W/HM61gptgvPPlpJE3dGHeyYemYAD135TuJ50RZTVLox06R6kuEba', 3, TRUE),
('egresado167@unicesar.edu.co', '$2b$12$W/HM61gptgvPPlpJE3dGHeyYemYAD135TuJ50RZTVLox06R6kuEba', 3, TRUE),
('egresado168@unicesar.edu.co', '$2b$12$W/HM61gptgvPPlpJE3dGHeyYemYAD135TuJ50RZTVLox06R6kuEba', 3, TRUE),
('egresado169@unicesar.edu.co', '$2b$12$W/HM61gptgvPPlpJE3dGHeyYemYAD135TuJ50RZTVLox06R6kuEba', 3, TRUE),
('egresado170@unicesar.edu.co', '$2b$12$W/HM61gptgvPPlpJE3dGHeyYemYAD135TuJ50RZTVLox06R6kuEba', 3, TRUE),
('egresado171@unicesar.edu.co', '$2b$12$W/HM61gptgvPPlpJE3dGHeyYemYAD135TuJ50RZTVLox06R6kuEba', 3, TRUE),
('egresado172@unicesar.edu.co', '$2b$12$W/HM61gptgvPPlpJE3dGHeyYemYAD135TuJ50RZTVLox06R6kuEba', 3, TRUE),
('egresado173@unicesar.edu.co', '$2b$12$W/HM61gptgvPPlpJE3dGHeyYemYAD135TuJ50RZTVLox06R6kuEba', 3, TRUE),
('egresado174@unicesar.edu.co', '$2b$12$W/HM61gptgvPPlpJE3dGHeyYemYAD135TuJ50RZTVLox06R6kuEba', 3, TRUE),
('egresado175@unicesar.edu.co', '$2b$12$W/HM61gptgvPPlpJE3dGHeyYemYAD135TuJ50RZTVLox06R6kuEba', 3, TRUE),
('egresado176@unicesar.edu.co', '$2b$12$W/HM61gptgvPPlpJE3dGHeyYemYAD135TuJ50RZTVLox06R6kuEba', 3, TRUE),
('egresado177@unicesar.edu.co', '$2b$12$W/HM61gptgvPPlpJE3dGHeyYemYAD135TuJ50RZTVLox06R6kuEba', 3, TRUE),
('egresado178@unicesar.edu.co', '$2b$12$W/HM61gptgvPPlpJE3dGHeyYemYAD135TuJ50RZTVLox06R6kuEba', 3, TRUE),
('egresado179@unicesar.edu.co', '$2b$12$W/HM61gptgvPPlpJE3dGHeyYemYAD135TuJ50RZTVLox06R6kuEba', 3, TRUE),
('egresado180@unicesar.edu.co', '$2b$12$W/HM61gptgvPPlpJE3dGHeyYemYAD135TuJ50RZTVLox06R6kuEba', 3, TRUE),
('egresado181@unicesar.edu.co', '$2b$12$W/HM61gptgvPPlpJE3dGHeyYemYAD135TuJ50RZTVLox06R6kuEba', 3, TRUE),
('egresado182@unicesar.edu.co', '$2b$12$W/HM61gptgvPPlpJE3dGHeyYemYAD135TuJ50RZTVLox06R6kuEba', 3, TRUE),
('egresado183@unicesar.edu.co', '$2b$12$W/HM61gptgvPPlpJE3dGHeyYemYAD135TuJ50RZTVLox06R6kuEba', 3, TRUE),
('egresado184@unicesar.edu.co', '$2b$12$W/HM61gptgvPPlpJE3dGHeyYemYAD135TuJ50RZTVLox06R6kuEba', 3, TRUE),
('egresado185@unicesar.edu.co', '$2b$12$W/HM61gptgvPPlpJE3dGHeyYemYAD135TuJ50RZTVLox06R6kuEba', 3, TRUE),
('egresado186@unicesar.edu.co', '$2b$12$W/HM61gptgvPPlpJE3dGHeyYemYAD135TuJ50RZTVLox06R6kuEba', 3, TRUE),
('egresado187@unicesar.edu.co', '$2b$12$W/HM61gptgvPPlpJE3dGHeyYemYAD135TuJ50RZTVLox06R6kuEba', 3, TRUE),
('egresado188@unicesar.edu.co', '$2b$12$W/HM61gptgvPPlpJE3dGHeyYemYAD135TuJ50RZTVLox06R6kuEba', 3, TRUE),
('egresado189@unicesar.edu.co', '$2b$12$W/HM61gptgvPPlpJE3dGHeyYemYAD135TuJ50RZTVLox06R6kuEba', 3, TRUE),
('egresado190@unicesar.edu.co', '$2b$12$W/HM61gptgvPPlpJE3dGHeyYemYAD135TuJ50RZTVLox06R6kuEba', 3, TRUE),
('egresado191@unicesar.edu.co', '$2b$12$W/HM61gptgvPPlpJE3dGHeyYemYAD135TuJ50RZTVLox06R6kuEba', 3, TRUE),
('egresado192@unicesar.edu.co', '$2b$12$W/HM61gptgvPPlpJE3dGHeyYemYAD135TuJ50RZTVLox06R6kuEba', 3, TRUE),
('egresado193@unicesar.edu.co', '$2b$12$W/HM61gptgvPPlpJE3dGHeyYemYAD135TuJ50RZTVLox06R6kuEba', 3, TRUE);

-- ------------------------------------------------------------------------------
-- GRADUATES DB
-- ------------------------------------------------------------------------------
\c graduates_db

CREATE TABLE faculties (
    id SERIAL PRIMARY KEY,
    name VARCHAR(150) UNIQUE NOT NULL
);

CREATE TABLE programs (
    id SERIAL PRIMARY KEY,
    name VARCHAR(150) UNIQUE NOT NULL,
    faculty_id INT REFERENCES faculties(id) ON DELETE CASCADE
);

CREATE TABLE skills (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) UNIQUE NOT NULL
);

CREATE TABLE languages (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) UNIQUE NOT NULL
);

CREATE TABLE graduates (
    user_id INT PRIMARY KEY, -- NO FOREIGN KEY TO USERS
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    program_id INT REFERENCES programs(id) ON DELETE RESTRICT,
    graduation_year INT NOT NULL,
    phone VARCHAR(20),
    cv_url VARCHAR(255),
    profile_summary TEXT,
    profile_picture_url VARCHAR(255)
);

CREATE TABLE graduate_skills (
    graduate_id INT REFERENCES graduates(user_id) ON DELETE CASCADE,
    skill_id INT REFERENCES skills(id) ON DELETE CASCADE,
    proficiency_level VARCHAR(50),
    PRIMARY KEY (graduate_id, skill_id)
);

CREATE TABLE graduate_languages (
    graduate_id INT REFERENCES graduates(user_id) ON DELETE CASCADE,
    language_id INT REFERENCES languages(id) ON DELETE CASCADE,
    proficiency_level VARCHAR(50),
    PRIMARY KEY (graduate_id, language_id)
);

CREATE TABLE work_experiences (
    id SERIAL PRIMARY KEY,
    graduate_id INT REFERENCES graduates(user_id) ON DELETE CASCADE,
    company_name VARCHAR(150) NOT NULL,
    position VARCHAR(100) NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE,
    description TEXT,
    certificate_url VARCHAR(255)
);

CREATE TABLE academic_histories (
    id SERIAL PRIMARY KEY,
    graduate_id INT REFERENCES graduates(user_id) ON DELETE CASCADE,
    institution VARCHAR(150) NOT NULL,
    degree VARCHAR(150) NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE,
    diploma_url VARCHAR(255)
);

CREATE TABLE certifications (
    id SERIAL PRIMARY KEY,
    graduate_id INT REFERENCES graduates(user_id) ON DELETE CASCADE,
    name VARCHAR(150) NOT NULL,
    issuing_organization VARCHAR(150) NOT NULL,
    issue_date DATE NOT NULL
);

CREATE TABLE surveys (
    id SERIAL PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    questions_json JSONB NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE survey_responses (
    id SERIAL PRIMARY KEY,
    survey_id INT REFERENCES surveys(id) ON DELETE CASCADE,
    graduate_id INT REFERENCES graduates(user_id) ON DELETE CASCADE,
    answers_json JSONB NOT NULL,
    submitted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(survey_id, graduate_id)
);

INSERT INTO faculties (name) VALUES
('Ingeniería y Tecnología'), ('Ciencias de la Salud'), ('Ciencias Administrativas'), ('Derecho y Ciencias Políticas'), ('Ciencias Básicas y Educación');
INSERT INTO programs (name, faculty_id) VALUES
('Ingeniería de Sistemas', 1), ('Ingeniería Ambiental', 1), ('Ingeniería Electrónica', 1),
('Enfermería', 2), ('Microbiología', 2), ('Instrumentación Quirúrgica', 2),
('Administración de Empresas', 3), ('Contaduría Pública', 3), ('Comercio Internacional', 3),
('Derecho', 4), ('Licenciatura en Matemáticas', 5);
INSERT INTO graduates (user_id, first_name, last_name, program_id, graduation_year, phone, profile_summary) VALUES
(3, 'Juan', 'Perez', 1, 2023, '3001234567', 'Desarrollador de software egresado');
INSERT INTO graduates (user_id, first_name, last_name, program_id, graduation_year, phone, profile_summary) VALUES
(44, 'Nombre44', 'Apellido44', 11, 2022, '300000044', 'Perfil generado'),
(45, 'Nombre45', 'Apellido45', 6, 2019, '300000045', 'Perfil generado'),
(46, 'Nombre46', 'Apellido46', 2, 2018, '300000046', 'Perfil generado'),
(47, 'Nombre47', 'Apellido47', 4, 2021, '300000047', 'Perfil generado'),
(48, 'Nombre48', 'Apellido48', 1, 2024, '300000048', 'Perfil generado'),
(49, 'Nombre49', 'Apellido49', 2, 2018, '300000049', 'Perfil generado'),
(50, 'Nombre50', 'Apellido50', 3, 2024, '300000050', 'Perfil generado'),
(51, 'Nombre51', 'Apellido51', 2, 2020, '300000051', 'Perfil generado'),
(52, 'Nombre52', 'Apellido52', 5, 2018, '300000052', 'Perfil generado'),
(53, 'Nombre53', 'Apellido53', 8, 2023, '300000053', 'Perfil generado'),
(54, 'Nombre54', 'Apellido54', 11, 2023, '300000054', 'Perfil generado'),
(55, 'Nombre55', 'Apellido55', 3, 2021, '300000055', 'Perfil generado'),
(56, 'Nombre56', 'Apellido56', 8, 2024, '300000056', 'Perfil generado'),
(57, 'Nombre57', 'Apellido57', 10, 2019, '300000057', 'Perfil generado'),
(58, 'Nombre58', 'Apellido58', 5, 2022, '300000058', 'Perfil generado'),
(59, 'Nombre59', 'Apellido59', 5, 2019, '300000059', 'Perfil generado'),
(60, 'Nombre60', 'Apellido60', 11, 2024, '300000060', 'Perfil generado'),
(61, 'Nombre61', 'Apellido61', 7, 2022, '300000061', 'Perfil generado'),
(62, 'Nombre62', 'Apellido62', 8, 2024, '300000062', 'Perfil generado'),
(63, 'Nombre63', 'Apellido63', 6, 2022, '300000063', 'Perfil generado'),
(64, 'Nombre64', 'Apellido64', 8, 2021, '300000064', 'Perfil generado'),
(65, 'Nombre65', 'Apellido65', 4, 2023, '300000065', 'Perfil generado'),
(66, 'Nombre66', 'Apellido66', 1, 2019, '300000066', 'Perfil generado'),
(67, 'Nombre67', 'Apellido67', 6, 2021, '300000067', 'Perfil generado'),
(68, 'Nombre68', 'Apellido68', 8, 2024, '300000068', 'Perfil generado'),
(69, 'Nombre69', 'Apellido69', 3, 2022, '300000069', 'Perfil generado'),
(70, 'Nombre70', 'Apellido70', 11, 2022, '300000070', 'Perfil generado'),
(71, 'Nombre71', 'Apellido71', 1, 2020, '300000071', 'Perfil generado'),
(72, 'Nombre72', 'Apellido72', 5, 2018, '300000072', 'Perfil generado'),
(73, 'Nombre73', 'Apellido73', 7, 2018, '300000073', 'Perfil generado'),
(74, 'Nombre74', 'Apellido74', 10, 2024, '300000074', 'Perfil generado'),
(75, 'Nombre75', 'Apellido75', 7, 2018, '300000075', 'Perfil generado'),
(76, 'Nombre76', 'Apellido76', 7, 2022, '300000076', 'Perfil generado'),
(77, 'Nombre77', 'Apellido77', 9, 2020, '300000077', 'Perfil generado'),
(78, 'Nombre78', 'Apellido78', 5, 2024, '300000078', 'Perfil generado'),
(79, 'Nombre79', 'Apellido79', 7, 2023, '300000079', 'Perfil generado'),
(80, 'Nombre80', 'Apellido80', 1, 2021, '300000080', 'Perfil generado'),
(81, 'Nombre81', 'Apellido81', 6, 2024, '300000081', 'Perfil generado'),
(82, 'Nombre82', 'Apellido82', 1, 2024, '300000082', 'Perfil generado'),
(83, 'Nombre83', 'Apellido83', 1, 2022, '300000083', 'Perfil generado'),
(84, 'Nombre84', 'Apellido84', 1, 2020, '300000084', 'Perfil generado'),
(85, 'Nombre85', 'Apellido85', 6, 2022, '300000085', 'Perfil generado'),
(86, 'Nombre86', 'Apellido86', 10, 2019, '300000086', 'Perfil generado'),
(87, 'Nombre87', 'Apellido87', 3, 2023, '300000087', 'Perfil generado'),
(88, 'Nombre88', 'Apellido88', 7, 2020, '300000088', 'Perfil generado'),
(89, 'Nombre89', 'Apellido89', 10, 2019, '300000089', 'Perfil generado'),
(90, 'Nombre90', 'Apellido90', 2, 2021, '300000090', 'Perfil generado'),
(91, 'Nombre91', 'Apellido91', 8, 2024, '300000091', 'Perfil generado'),
(92, 'Nombre92', 'Apellido92', 8, 2021, '300000092', 'Perfil generado'),
(93, 'Nombre93', 'Apellido93', 3, 2018, '300000093', 'Perfil generado'),
(94, 'Nombre94', 'Apellido94', 8, 2022, '300000094', 'Perfil generado'),
(95, 'Nombre95', 'Apellido95', 6, 2019, '300000095', 'Perfil generado'),
(96, 'Nombre96', 'Apellido96', 9, 2020, '300000096', 'Perfil generado'),
(97, 'Nombre97', 'Apellido97', 3, 2018, '300000097', 'Perfil generado'),
(98, 'Nombre98', 'Apellido98', 2, 2021, '300000098', 'Perfil generado'),
(99, 'Nombre99', 'Apellido99', 4, 2023, '300000099', 'Perfil generado'),
(100, 'Nombre100', 'Apellido100', 5, 2021, '3000000100', 'Perfil generado'),
(101, 'Nombre101', 'Apellido101', 4, 2023, '3000000101', 'Perfil generado'),
(102, 'Nombre102', 'Apellido102', 4, 2018, '3000000102', 'Perfil generado'),
(103, 'Nombre103', 'Apellido103', 9, 2020, '3000000103', 'Perfil generado'),
(104, 'Nombre104', 'Apellido104', 9, 2019, '3000000104', 'Perfil generado'),
(105, 'Nombre105', 'Apellido105', 2, 2019, '3000000105', 'Perfil generado'),
(106, 'Nombre106', 'Apellido106', 5, 2018, '3000000106', 'Perfil generado'),
(107, 'Nombre107', 'Apellido107', 7, 2018, '3000000107', 'Perfil generado'),
(108, 'Nombre108', 'Apellido108', 11, 2019, '3000000108', 'Perfil generado'),
(109, 'Nombre109', 'Apellido109', 7, 2022, '3000000109', 'Perfil generado'),
(110, 'Nombre110', 'Apellido110', 1, 2021, '3000000110', 'Perfil generado'),
(111, 'Nombre111', 'Apellido111', 10, 2020, '3000000111', 'Perfil generado'),
(112, 'Nombre112', 'Apellido112', 11, 2023, '3000000112', 'Perfil generado'),
(113, 'Nombre113', 'Apellido113', 3, 2020, '3000000113', 'Perfil generado'),
(114, 'Nombre114', 'Apellido114', 10, 2019, '3000000114', 'Perfil generado'),
(115, 'Nombre115', 'Apellido115', 4, 2019, '3000000115', 'Perfil generado'),
(116, 'Nombre116', 'Apellido116', 7, 2020, '3000000116', 'Perfil generado'),
(117, 'Nombre117', 'Apellido117', 2, 2024, '3000000117', 'Perfil generado'),
(118, 'Nombre118', 'Apellido118', 2, 2022, '3000000118', 'Perfil generado'),
(119, 'Nombre119', 'Apellido119', 1, 2020, '3000000119', 'Perfil generado'),
(120, 'Nombre120', 'Apellido120', 4, 2023, '3000000120', 'Perfil generado'),
(121, 'Nombre121', 'Apellido121', 8, 2023, '3000000121', 'Perfil generado'),
(122, 'Nombre122', 'Apellido122', 5, 2019, '3000000122', 'Perfil generado'),
(123, 'Nombre123', 'Apellido123', 2, 2023, '3000000123', 'Perfil generado'),
(124, 'Nombre124', 'Apellido124', 2, 2021, '3000000124', 'Perfil generado'),
(125, 'Nombre125', 'Apellido125', 5, 2021, '3000000125', 'Perfil generado'),
(126, 'Nombre126', 'Apellido126', 1, 2018, '3000000126', 'Perfil generado'),
(127, 'Nombre127', 'Apellido127', 11, 2024, '3000000127', 'Perfil generado'),
(128, 'Nombre128', 'Apellido128', 8, 2018, '3000000128', 'Perfil generado'),
(129, 'Nombre129', 'Apellido129', 9, 2024, '3000000129', 'Perfil generado'),
(130, 'Nombre130', 'Apellido130', 10, 2019, '3000000130', 'Perfil generado'),
(131, 'Nombre131', 'Apellido131', 5, 2018, '3000000131', 'Perfil generado'),
(132, 'Nombre132', 'Apellido132', 4, 2020, '3000000132', 'Perfil generado'),
(133, 'Nombre133', 'Apellido133', 8, 2024, '3000000133', 'Perfil generado'),
(134, 'Nombre134', 'Apellido134', 4, 2020, '3000000134', 'Perfil generado'),
(135, 'Nombre135', 'Apellido135', 4, 2021, '3000000135', 'Perfil generado'),
(136, 'Nombre136', 'Apellido136', 3, 2022, '3000000136', 'Perfil generado'),
(137, 'Nombre137', 'Apellido137', 10, 2023, '3000000137', 'Perfil generado'),
(138, 'Nombre138', 'Apellido138', 3, 2019, '3000000138', 'Perfil generado'),
(139, 'Nombre139', 'Apellido139', 4, 2021, '3000000139', 'Perfil generado'),
(140, 'Nombre140', 'Apellido140', 4, 2019, '3000000140', 'Perfil generado'),
(141, 'Nombre141', 'Apellido141', 9, 2022, '3000000141', 'Perfil generado'),
(142, 'Nombre142', 'Apellido142', 6, 2020, '3000000142', 'Perfil generado'),
(143, 'Nombre143', 'Apellido143', 2, 2021, '3000000143', 'Perfil generado'),
(144, 'Nombre144', 'Apellido144', 2, 2018, '3000000144', 'Perfil generado'),
(145, 'Nombre145', 'Apellido145', 10, 2019, '3000000145', 'Perfil generado'),
(146, 'Nombre146', 'Apellido146', 11, 2019, '3000000146', 'Perfil generado'),
(147, 'Nombre147', 'Apellido147', 4, 2018, '3000000147', 'Perfil generado'),
(148, 'Nombre148', 'Apellido148', 1, 2024, '3000000148', 'Perfil generado'),
(149, 'Nombre149', 'Apellido149', 7, 2022, '3000000149', 'Perfil generado'),
(150, 'Nombre150', 'Apellido150', 3, 2022, '3000000150', 'Perfil generado'),
(151, 'Nombre151', 'Apellido151', 5, 2021, '3000000151', 'Perfil generado'),
(152, 'Nombre152', 'Apellido152', 9, 2022, '3000000152', 'Perfil generado'),
(153, 'Nombre153', 'Apellido153', 3, 2024, '3000000153', 'Perfil generado'),
(154, 'Nombre154', 'Apellido154', 10, 2024, '3000000154', 'Perfil generado'),
(155, 'Nombre155', 'Apellido155', 9, 2021, '3000000155', 'Perfil generado'),
(156, 'Nombre156', 'Apellido156', 4, 2024, '3000000156', 'Perfil generado'),
(157, 'Nombre157', 'Apellido157', 9, 2024, '3000000157', 'Perfil generado'),
(158, 'Nombre158', 'Apellido158', 3, 2022, '3000000158', 'Perfil generado'),
(159, 'Nombre159', 'Apellido159', 9, 2023, '3000000159', 'Perfil generado'),
(160, 'Nombre160', 'Apellido160', 11, 2021, '3000000160', 'Perfil generado'),
(161, 'Nombre161', 'Apellido161', 1, 2019, '3000000161', 'Perfil generado'),
(162, 'Nombre162', 'Apellido162', 5, 2018, '3000000162', 'Perfil generado'),
(163, 'Nombre163', 'Apellido163', 3, 2022, '3000000163', 'Perfil generado'),
(164, 'Nombre164', 'Apellido164', 3, 2020, '3000000164', 'Perfil generado'),
(165, 'Nombre165', 'Apellido165', 3, 2022, '3000000165', 'Perfil generado'),
(166, 'Nombre166', 'Apellido166', 9, 2018, '3000000166', 'Perfil generado'),
(167, 'Nombre167', 'Apellido167', 3, 2022, '3000000167', 'Perfil generado'),
(168, 'Nombre168', 'Apellido168', 11, 2024, '3000000168', 'Perfil generado'),
(169, 'Nombre169', 'Apellido169', 11, 2018, '3000000169', 'Perfil generado'),
(170, 'Nombre170', 'Apellido170', 9, 2018, '3000000170', 'Perfil generado'),
(171, 'Nombre171', 'Apellido171', 6, 2023, '3000000171', 'Perfil generado'),
(172, 'Nombre172', 'Apellido172', 8, 2021, '3000000172', 'Perfil generado'),
(173, 'Nombre173', 'Apellido173', 10, 2024, '3000000173', 'Perfil generado'),
(174, 'Nombre174', 'Apellido174', 9, 2018, '3000000174', 'Perfil generado'),
(175, 'Nombre175', 'Apellido175', 1, 2023, '3000000175', 'Perfil generado'),
(176, 'Nombre176', 'Apellido176', 2, 2021, '3000000176', 'Perfil generado'),
(177, 'Nombre177', 'Apellido177', 11, 2022, '3000000177', 'Perfil generado'),
(178, 'Nombre178', 'Apellido178', 10, 2018, '3000000178', 'Perfil generado'),
(179, 'Nombre179', 'Apellido179', 9, 2020, '3000000179', 'Perfil generado'),
(180, 'Nombre180', 'Apellido180', 5, 2022, '3000000180', 'Perfil generado'),
(181, 'Nombre181', 'Apellido181', 5, 2024, '3000000181', 'Perfil generado'),
(182, 'Nombre182', 'Apellido182', 9, 2021, '3000000182', 'Perfil generado'),
(183, 'Nombre183', 'Apellido183', 7, 2021, '3000000183', 'Perfil generado'),
(184, 'Nombre184', 'Apellido184', 6, 2018, '3000000184', 'Perfil generado'),
(185, 'Nombre185', 'Apellido185', 9, 2021, '3000000185', 'Perfil generado'),
(186, 'Nombre186', 'Apellido186', 2, 2022, '3000000186', 'Perfil generado'),
(187, 'Nombre187', 'Apellido187', 6, 2020, '3000000187', 'Perfil generado'),
(188, 'Nombre188', 'Apellido188', 2, 2023, '3000000188', 'Perfil generado'),
(189, 'Nombre189', 'Apellido189', 10, 2019, '3000000189', 'Perfil generado'),
(190, 'Nombre190', 'Apellido190', 1, 2023, '3000000190', 'Perfil generado'),
(191, 'Nombre191', 'Apellido191', 9, 2018, '3000000191', 'Perfil generado'),
(192, 'Nombre192', 'Apellido192', 10, 2022, '3000000192', 'Perfil generado'),
(193, 'Nombre193', 'Apellido193', 9, 2023, '3000000193', 'Perfil generado');

INSERT INTO skills (name) VALUES
    ('React'), ('Node.js'), ('PostgreSQL'), ('Python'), ('SQL'), ('Excel avanzado')
ON CONFLICT (name) DO NOTHING;

INSERT INTO graduate_skills (graduate_id, skill_id, proficiency_level)
SELECT 3, id, 'Intermedio' FROM skills WHERE name IN ('React', 'PostgreSQL')
ON CONFLICT DO NOTHING;

-- ------------------------------------------------------------------------------
-- COMPANIES DB
-- ------------------------------------------------------------------------------
\c companies_db

CREATE TABLE countries (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) UNIQUE NOT NULL
);

CREATE TABLE states (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    country_id INT REFERENCES countries(id) ON DELETE CASCADE
);

CREATE TABLE cities (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    state_id INT REFERENCES states(id) ON DELETE CASCADE
);

CREATE TABLE sectors (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) UNIQUE NOT NULL
);

CREATE TABLE faculties (
    id SERIAL PRIMARY KEY,
    name VARCHAR(150) UNIQUE NOT NULL
);

CREATE TABLE programs (
    id SERIAL PRIMARY KEY,
    name VARCHAR(150) UNIQUE NOT NULL,
    faculty_id INT REFERENCES faculties(id) ON DELETE CASCADE
);

CREATE TABLE companies (
    user_id INT PRIMARY KEY, -- NO FOREIGN KEY TO USERS
    name VARCHAR(150) NOT NULL,
    description TEXT,
    contact_email VARCHAR(255) NOT NULL,
    sector_id INT REFERENCES sectors(id) ON DELETE RESTRICT,
    city_id INT REFERENCES cities(id) ON DELETE RESTRICT,
    status VARCHAR(20) DEFAULT 'PENDING'
);

CREATE TABLE job_offers (
    id SERIAL PRIMARY KEY,
    company_id INT REFERENCES companies(user_id) ON DELETE CASCADE,
    title VARCHAR(150) NOT NULL,
    description TEXT NOT NULL,
    requirements TEXT NOT NULL,
    functions TEXT NOT NULL,
    salary_min NUMERIC(10, 2),
    salary_max NUMERIC(10, 2),
    min_experience_years INT DEFAULT 0,
    modality VARCHAR(50) DEFAULT 'Presencial',
    contract_type VARCHAR(50) DEFAULT 'Indefinido',
    program_id INT REFERENCES programs(id) ON DELETE RESTRICT,
    closing_date DATE NOT NULL,
    available_slots INT DEFAULT 1,
    status VARCHAR(20) DEFAULT 'ACTIVE',
    sub_processes_config JSONB DEFAULT '{}'::jsonb
);


CREATE TABLE skills (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) UNIQUE NOT NULL
);

CREATE TABLE job_offer_skills (
    job_offer_id INT REFERENCES job_offers(id) ON DELETE CASCADE,
    skill_id INT REFERENCES skills(id) ON DELETE CASCADE,
    required_level VARCHAR(50),
    PRIMARY KEY (job_offer_id, skill_id)
);

CREATE TABLE applications (
    id SERIAL PRIMARY KEY,
    job_offer_id INT REFERENCES job_offers(id) ON DELETE CASCADE,
    graduate_id INT NOT NULL, -- NO FOREIGN KEY TO GRADUATES
    application_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    status VARCHAR(20) DEFAULT 'POSTULADO',
    rejection_reason TEXT
);

CREATE TABLE application_sub_processes (
    id SERIAL PRIMARY KEY,
    application_id INT REFERENCES applications(id) ON DELETE CASCADE,
    tipo VARCHAR(50) NOT NULL,
    nombre VARCHAR(255) NOT NULL,
    descripcion TEXT,
    etapa_kanban VARCHAR(50) NOT NULL,
    fecha_limite TIMESTAMP,
    estado VARCHAR(50) DEFAULT 'pendiente',
    es_formulario BOOLEAN DEFAULT FALSE,
    preguntas_json JSONB,
    respuestas_json JSONB,
    enlace_adjunto VARCHAR(255),
    archivo_respuesta VARCHAR(255),
    score INT
);

INSERT INTO countries (name) VALUES ('Colombia');
INSERT INTO states (name, country_id) VALUES ('Cesar', 1), ('Atlántico', 1), ('Bogotá D.C.', 1);
INSERT INTO cities (name, state_id) VALUES 
('Valledupar', 1), ('Aguachica', 1), ('Agustín Codazzi', 1), ('Bosconia', 1), ('Chimichagua', 1), ('El Copey', 1), ('San Alberto', 1), ('Curumaní', 1), ('La Paz', 1), ('Pueblo Bello', 1),
('Barranquilla', 2), ('Soledad', 2), ('Malambo', 2), ('Sabanalarga', 2), ('Baranoa', 2),
('Bogotá', 3), 
('Medellín', 1), ('Cali', 1), ('Bucaramanga', 1), ('Cartagena', 1), ('Santa Marta', 1), ('Pereira', 1), ('Manizales', 1), ('Cúcuta', 1), ('Ibagué', 1), ('Villavicencio', 1), ('Pasto', 1), ('Montería', 1), ('Valledupar', 1), ('Popayán', 1), ('Sincelejo', 1), ('Riohacha', 1), ('Tunja', 1), ('Florencia', 1), ('Quibdó', 1), ('Arauca', 1), ('Yopal', 1), ('Mocoa', 1), ('Puerto Carreño', 1), ('Inírida', 1), ('San José del Guaviare', 1), ('Mitú', 1), ('Leticia', 1), ('San Andrés', 1);
INSERT INTO sectors (name) VALUES
('Tecnología y Software'), ('Salud y Medicina'), ('Educación y Formación'), ('Finanzas y Seguros'), ('Construcción e Ingeniería'), ('Agricultura y Ganadería'),
('Comercio Minorista (Retail)'), ('Telecomunicaciones'), ('Energía y Minería'), ('Transporte y Logística'), ('Manufactura y Producción'), ('Turismo y Hostelería'),
('Marketing y Publicidad'), ('Consultoría Empresarial'), ('Servicios Legales'), ('Arte y Entretenimiento'), ('Medios de Comunicación'), ('Gobierno y Administración Pública'),
('Recursos Humanos'), ('Desarrollo Inmobiliario');
INSERT INTO faculties (name) VALUES
('Ingeniería y Tecnología'), ('Ciencias de la Salud'), ('Ciencias Administrativas'), ('Derecho y Ciencias Políticas'), ('Ciencias Básicas y Educación');
INSERT INTO programs (name, faculty_id) VALUES
('Ingeniería de Sistemas', 1), ('Ingeniería Ambiental', 1), ('Ingeniería Electrónica', 1),
('Enfermería', 2), ('Microbiología', 2), ('Instrumentación Quirúrgica', 2),
('Administración de Empresas', 3), ('Contaduría Pública', 3), ('Comercio Internacional', 3),
('Derecho', 4), ('Licenciatura en Matemáticas', 5);
INSERT INTO companies (user_id, name, description, contact_email, sector_id, city_id, status) VALUES
(2, 'Empresa Principal', 'Nuestra empresa ejemplo principal', 'contacto@empresa.com', 1, 1, 'APPROVED');
INSERT INTO companies (user_id, name, description, contact_email, sector_id, city_id, status) VALUES
(4, 'Empresa 4 S.A.S.', 'Descripción generada 4', 'contacto4@empresa.com', 1, 28, 'APPROVED'),
(5, 'Empresa 5 S.A.S.', 'Descripción generada 5', 'contacto5@empresa.com', 7, 21, 'APPROVED'),
(6, 'Empresa 6 S.A.S.', 'Descripción generada 6', 'contacto6@empresa.com', 17, 2, 'APPROVED'),
(7, 'Empresa 7 S.A.S.', 'Descripción generada 7', 'contacto7@empresa.com', 19, 8, 'APPROVED'),
(8, 'Empresa 8 S.A.S.', 'Descripción generada 8', 'contacto8@empresa.com', 16, 28, 'APPROVED'),
(9, 'Empresa 9 S.A.S.', 'Descripción generada 9', 'contacto9@empresa.com', 8, 8, 'APPROVED'),
(10, 'Empresa 10 S.A.S.', 'Descripción generada 10', 'contacto10@empresa.com', 8, 14, 'APPROVED'),
(11, 'Empresa 11 S.A.S.', 'Descripción generada 11', 'contacto11@empresa.com', 15, 8, 'APPROVED'),
(12, 'Empresa 12 S.A.S.', 'Descripción generada 12', 'contacto12@empresa.com', 6, 20, 'APPROVED'),
(13, 'Empresa 13 S.A.S.', 'Descripción generada 13', 'contacto13@empresa.com', 9, 16, 'APPROVED'),
(14, 'Empresa 14 S.A.S.', 'Descripción generada 14', 'contacto14@empresa.com', 20, 39, 'APPROVED'),
(15, 'Empresa 15 S.A.S.', 'Descripción generada 15', 'contacto15@empresa.com', 17, 12, 'APPROVED'),
(16, 'Empresa 16 S.A.S.', 'Descripción generada 16', 'contacto16@empresa.com', 13, 36, 'APPROVED'),
(17, 'Empresa 17 S.A.S.', 'Descripción generada 17', 'contacto17@empresa.com', 8, 17, 'APPROVED'),
(18, 'Empresa 18 S.A.S.', 'Descripción generada 18', 'contacto18@empresa.com', 19, 28, 'APPROVED'),
(19, 'Empresa 19 S.A.S.', 'Descripción generada 19', 'contacto19@empresa.com', 8, 35, 'APPROVED'),
(20, 'Empresa 20 S.A.S.', 'Descripción generada 20', 'contacto20@empresa.com', 12, 11, 'APPROVED'),
(21, 'Empresa 21 S.A.S.', 'Descripción generada 21', 'contacto21@empresa.com', 5, 16, 'APPROVED'),
(22, 'Empresa 22 S.A.S.', 'Descripción generada 22', 'contacto22@empresa.com', 9, 37, 'APPROVED'),
(23, 'Empresa 23 S.A.S.', 'Descripción generada 23', 'contacto23@empresa.com', 5, 6, 'APPROVED'),
(24, 'Empresa 24 S.A.S.', 'Descripción generada 24', 'contacto24@empresa.com', 1, 37, 'APPROVED'),
(25, 'Empresa 25 S.A.S.', 'Descripción generada 25', 'contacto25@empresa.com', 15, 25, 'APPROVED'),
(26, 'Empresa 26 S.A.S.', 'Descripción generada 26', 'contacto26@empresa.com', 10, 10, 'APPROVED'),
(27, 'Empresa 27 S.A.S.', 'Descripción generada 27', 'contacto27@empresa.com', 19, 24, 'APPROVED'),
(28, 'Empresa 28 S.A.S.', 'Descripción generada 28', 'contacto28@empresa.com', 2, 3, 'APPROVED'),
(29, 'Empresa 29 S.A.S.', 'Descripción generada 29', 'contacto29@empresa.com', 12, 33, 'APPROVED'),
(30, 'Empresa 30 S.A.S.', 'Descripción generada 30', 'contacto30@empresa.com', 17, 10, 'APPROVED'),
(31, 'Empresa 31 S.A.S.', 'Descripción generada 31', 'contacto31@empresa.com', 8, 18, 'APPROVED'),
(32, 'Empresa 32 S.A.S.', 'Descripción generada 32', 'contacto32@empresa.com', 19, 11, 'APPROVED'),
(33, 'Empresa 33 S.A.S.', 'Descripción generada 33', 'contacto33@empresa.com', 18, 26, 'APPROVED'),
(34, 'Empresa 34 S.A.S.', 'Descripción generada 34', 'contacto34@empresa.com', 15, 24, 'APPROVED'),
(35, 'Empresa 35 S.A.S.', 'Descripción generada 35', 'contacto35@empresa.com', 19, 8, 'APPROVED'),
(36, 'Empresa 36 S.A.S.', 'Descripción generada 36', 'contacto36@empresa.com', 2, 19, 'APPROVED'),
(37, 'Empresa 37 S.A.S.', 'Descripción generada 37', 'contacto37@empresa.com', 15, 38, 'APPROVED'),
(38, 'Empresa 38 S.A.S.', 'Descripción generada 38', 'contacto38@empresa.com', 9, 25, 'APPROVED'),
(39, 'Empresa 39 S.A.S.', 'Descripción generada 39', 'contacto39@empresa.com', 16, 21, 'APPROVED'),
(40, 'Empresa 40 S.A.S.', 'Descripción generada 40', 'contacto40@empresa.com', 13, 40, 'APPROVED'),
(41, 'Empresa 41 S.A.S.', 'Descripción generada 41', 'contacto41@empresa.com', 2, 31, 'APPROVED'),
(42, 'Empresa 42 S.A.S.', 'Descripción generada 42', 'contacto42@empresa.com', 10, 23, 'APPROVED'),
(43, 'Empresa 43 S.A.S.', 'Descripción generada 43', 'contacto43@empresa.com', 16, 20, 'APPROVED');

INSERT INTO skills (name) VALUES
    ('React'), ('Node.js'), ('PostgreSQL'), ('Python'), ('SQL'), ('Excel avanzado')
ON CONFLICT (name) DO NOTHING;

INSERT INTO job_offers (company_id, title, description, requirements, functions, salary_min, salary_max, min_experience_years, program_id, closing_date, status) VALUES
(2, 'Desarrollador Senior Backend', 'Unete a nuestro equipo core', '5 años Python', 'Desarrollar APIs', 4000000, 6000000, 5, 1, '2026-12-31', 'ACTIVE'),
(4, 'Enfermero/a Jefe', 'Hospital central', 'Liderazgo y proactividad', 'Gestión de pacientes', 2500000, 3500000, 3, 4, '2026-10-31', 'ACTIVE'),
(5, 'Analista Contable', 'Auditoria financiera', 'Excel avanzado', 'Revisión de estados', 1800000, 2200000, 1, 8, '2026-09-15', 'ACTIVE'),
(6, 'Ingeniero de Datos', 'Procesamiento masivo', 'SQL, Spark', 'ETL', 3500000, 5000000, 2, 1, '2026-11-20', 'ACTIVE'),
(7, 'Gerente de Marketing', 'Lanzamiento de campañas', 'Marketing digital', 'Estrategia SEO/SEM', 3000000, 4500000, 4, 7, '2026-12-01', 'ACTIVE'),
(2, 'Desarrollador Frontend', 'React JS Angular', '3 años React', 'Maquetación UI', 3000000, 4000000, 3, 1, '2026-11-01', 'ACTIVE');

INSERT INTO job_offer_skills (job_offer_id, skill_id, required_level)
SELECT 1, id, 'Intermedio' FROM skills WHERE name IN ('React', 'Node.js', 'PostgreSQL')
ON CONFLICT DO NOTHING;

INSERT INTO job_offer_skills (job_offer_id, skill_id, required_level)
SELECT 2, id, 'Intermedio' FROM skills WHERE name IN ('Python', 'SQL', 'Excel avanzado')
ON CONFLICT DO NOTHING;

INSERT INTO applications (job_offer_id, graduate_id, application_date, status) VALUES
(1, 3, NOW() - (random() * 180 || ' days')::interval, 'POSTULADO'),
(2, 3, NOW() - (random() * 180 || ' days')::interval, 'ENTREVISTADO'),
(3, 3, NOW() - (random() * 180 || ' days')::interval, 'CONTRATADO'),
(4, 3, NOW() - (random() * 180 || ' days')::interval, 'POSTULADO'),
(5, 3, NOW() - (random() * 180 || ' days')::interval, 'POSTULADO'),
(1, 44, NOW() - (random() * 180 || ' days')::interval, 'ENTREVISTADO'),
(1, 45, NOW() - (random() * 180 || ' days')::interval, 'POSTULADO'),
(1, 46, NOW() - (random() * 180 || ' days')::interval, 'CONTRATADO'),
(2, 47, NOW() - (random() * 180 || ' days')::interval, 'POSTULADO'),
(2, 48, NOW() - (random() * 180 || ' days')::interval, 'CONTRATADO'),
(2, 49, NOW() - (random() * 180 || ' days')::interval, 'ENTREVISTADO'),
(3, 50, NOW() - (random() * 180 || ' days')::interval, 'POSTULADO'),
(3, 51, NOW() - (random() * 180 || ' days')::interval, 'ENTREVISTADO'),
(3, 52, NOW() - (random() * 180 || ' days')::interval, 'CONTRATADO'),
(4, 53, NOW() - (random() * 180 || ' days')::interval, 'POSTULADO'),
(4, 54, NOW() - (random() * 180 || ' days')::interval, 'POSTULADO'),
(4, 55, NOW() - (random() * 180 || ' days')::interval, 'CONTRATADO'),
(5, 56, NOW() - (random() * 180 || ' days')::interval, 'ENTREVISTADO'),
(5, 57, NOW() - (random() * 180 || ' days')::interval, 'POSTULADO'),
(5, 58, NOW() - (random() * 180 || ' days')::interval, 'CONTRATADO'),
(6, 59, NOW() - (random() * 180 || ' days')::interval, 'ENTREVISTADO'),
(6, 60, NOW() - (random() * 180 || ' days')::interval, 'CONTRATADO'),
(1, 61, NOW() - (random() * 180 || ' days')::interval, 'POSTULADO'),
(2, 62, NOW() - (random() * 180 || ' days')::interval, 'POSTULADO');

-- ------------------------------------------------------------------------------
-- MATCHMAKING DB
-- ------------------------------------------------------------------------------
\c matchmaking_db

CREATE TABLE matchmaking_weights (
    id SERIAL PRIMARY KEY,
    program_weight NUMERIC(4, 2) DEFAULT 0.40,
    skills_weight NUMERIC(4, 2) DEFAULT 0.40,
    experience_weight NUMERIC(4, 2) DEFAULT 0.20,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);


CREATE TABLE matches (
    id SERIAL PRIMARY KEY,
    graduate_id INT NOT NULL,
    job_offer_id INT NOT NULL,
    score NUMERIC(5,2) NOT NULL,
    program_score NUMERIC(5,2),
    skills_score NUMERIC(5,2),
    experience_score NUMERIC(5,2),
    calculated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(graduate_id, job_offer_id)
);

CREATE TABLE match_notifications (
    id SERIAL PRIMARY KEY,
    graduate_id INT NOT NULL,
    job_offer_id INT NOT NULL,
    score NUMERIC(5,2) NOT NULL,
    is_read BOOLEAN DEFAULT FALSE,
    sent_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO matchmaking_weights (program_weight, skills_weight, experience_weight) VALUES (0.40, 0.40, 0.20);
