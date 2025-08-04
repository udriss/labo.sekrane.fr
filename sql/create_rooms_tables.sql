-- Création de la table rooms
CREATE TABLE IF NOT EXISTS rooms (
  id VARCHAR(50) PRIMARY KEY,
  name VARCHAR(255) NOT NULL UNIQUE,
  description TEXT,
  capacity INT DEFAULT NULL,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_room_name (name),
  INDEX idx_room_active (is_active)
);

-- Création de la table locations
CREATE TABLE IF NOT EXISTS locations (
  id VARCHAR(50) PRIMARY KEY,
  room_id VARCHAR(50) NOT NULL,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (room_id) REFERENCES rooms(id) ON DELETE CASCADE,
  INDEX idx_location_room_id (room_id),
  INDEX idx_location_name (name),
  INDEX idx_location_active (is_active),
  UNIQUE KEY unique_room_location (room_id, name)
);

-- Insérer les données initiales des salles depuis rooms.json
INSERT INTO rooms (id, name, description, capacity, is_active) VALUES 
('ROOM_001', 'Salle de TP A', 'Salle principale de travaux pratiques', 24, TRUE),
('ROOM_002', 'Salle de TP B', 'Salle de travaux pratiques avancés', 16, TRUE),
('ROOM_003', 'Laboratoire de Physique', 'Laboratoire spécialisé en physique', 20, TRUE),
('ROOM_004', 'Amphithéâtre', 'Grande salle de cours magistraux', 100, TRUE),
('ROOM_005', 'Salle de préparation', 'Salle de préparation des expériences', 8, TRUE)
ON DUPLICATE KEY UPDATE
name = VALUES(name),
description = VALUES(description),
capacity = VALUES(capacity),
is_active = VALUES(is_active);

-- Insérer les localisations
INSERT INTO locations (id, room_id, name, description, is_active) VALUES
-- Salle de TP A
('LOC_001', 'ROOM_001', 'Paillasse 1', 'Paillasse côté fenêtre', TRUE),
('LOC_002', 'ROOM_001', 'Paillasse 2', 'Paillasse centrale', TRUE),
('LOC_003', 'ROOM_001', 'Armoire de stockage', 'Armoire murale', TRUE),
('LOC_004', 'ROOM_001', 'Hotte aspirante', 'Zone de manipulation sous hotte', TRUE),
-- Salle de TP B
('LOC_005', 'ROOM_002', 'Paillasse 1', 'Paillasse équipée', TRUE),
('LOC_006', 'ROOM_002', 'Paillasse 2', 'Paillasse avec microscopes', TRUE),
('LOC_007', 'ROOM_002', 'Zone balance', 'Espace de pesée précise', TRUE),
-- Laboratoire de Physique
('LOC_008', 'ROOM_003', 'Table optique', 'Table pour expériences optiques', TRUE),
('LOC_009', 'ROOM_003', 'Générateur haute tension', 'Zone électricité', TRUE),
('LOC_010', 'ROOM_003', 'Armoire matériel', 'Stockage du matériel de physique', TRUE),
-- Amphithéâtre
('LOC_011', 'ROOM_004', 'Estrade', 'Espace professeur', TRUE),
('LOC_012', 'ROOM_004', 'Table de démonstration', 'Table pour démonstrations', TRUE),
-- Salle de préparation
('LOC_013', 'ROOM_005', 'Plan de travail', 'Surface de préparation', TRUE),
('LOC_014', 'ROOM_005', 'Réfrigérateur', 'Stockage réfrigéré', TRUE)
ON DUPLICATE KEY UPDATE
name = VALUES(name),
description = VALUES(description),
is_active = VALUES(is_active);
