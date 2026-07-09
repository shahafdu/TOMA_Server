-- Mockup DB bootstrap: recreate the two legacy schemas and the app user.
-- Run as root. Destructive (clean slate) — this is a disposable test database.
DROP DATABASE IF EXISTS coma;
DROP DATABASE IF EXISTS emma;
CREATE DATABASE coma CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE DATABASE emma CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE USER IF NOT EXISTS 'toma'@'%' IDENTIFIED BY 'toma';
CREATE USER IF NOT EXISTS 'toma'@'localhost' IDENTIFIED BY 'toma';
GRANT ALL PRIVILEGES ON coma.* TO 'toma'@'%';
GRANT ALL PRIVILEGES ON emma.* TO 'toma'@'%';
GRANT ALL PRIVILEGES ON coma.* TO 'toma'@'localhost';
GRANT ALL PRIVILEGES ON emma.* TO 'toma'@'localhost';
FLUSH PRIVILEGES;
