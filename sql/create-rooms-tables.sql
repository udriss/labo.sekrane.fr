-- Script SQL pour créer les tables de gestion des salles et emplacements

-- Table des salles
CREATE TABLE IF NOT EXISTS rooms (
  id VARCHAR(50) PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  capacity INT DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Table des emplacements (locations) dans les salles
CREATE TABLE IF NOT EXISTS room_locations (
  id VARCHAR(50) PRIMARY KEY,
  room_id VARCHAR(50) NOT NULL,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (room_id) REFERENCES rooms(id) ON DELETE CASCADE
);

-- Insérer les données depuis rooms.json
INSERT INTO rooms (id, name, description, is_active, capacity) VALUES
('ROOM_001', 'Salle de TP A', 'Salle principale de travaux pratiques', TRUE, 24),
('ROOM_002', 'Salle de TP B', 'Salle de travaux pratiques avancés', TRUE, 16),
('ROOM_003', 'Salle de TP C', 'Salle de travaux pratiques spécialisés', TRUE, 20),
('ROOM_004', 'Laboratoire de recherche', 'Laboratoire pour la recherche avancée', TRUE, 8),
('ROOM_005', 'Salle de préparation', 'Salle de préparation des expériences', TRUE, 6),
('ROOM_006', 'Amphithéâtre', 'Amphithéâtre pour les cours magistraux', TRUE, 120);

-- Insérer les emplacements
INSERT INTO room_locations (id, room_id, name, description, is_active) VALUES
-- Salle de TP A
('LOC_001', 'ROOM_001', 'Paillasse 1', 'Paillasse côté fenêtre', TRUE),
('LOC_002', 'ROOM_001', 'Paillasse 2', 'Paillasse centrale', TRUE),
('LOC_003', 'ROOM_001', 'Armoire de stockage', 'Armoire murale', TRUE),
('LOC_004', 'ROOM_001', 'Hotte aspirante', 'Zone de manipulation sous hotte', TRUE),

-- Salle de TP B
('LOC_005', 'ROOM_002', 'Paillasse 1', 'Paillasse équipée', TRUE),
('LOC_006', 'ROOM_002', 'Paillasse 2', 'Paillasse avec microscopes', TRUE),
('LOC_007', 'ROOM_002', 'Zone spectromètre', 'Espace dédié spectromètre', TRUE),
('LOC_008', 'ROOM_002', 'Armoire réfrigérée', 'Stockage réfrigéré', TRUE),

-- Salle de TP C
('LOC_009', 'ROOM_003', 'Paillasse 1', 'Paillasse principale', TRUE),
('LOC_010', 'ROOM_003', 'Paillasse 2', 'Paillasse secondaire', TRUE),
('LOC_011', 'ROOM_003', 'Hotte', 'Hotte aspirante principale', TRUE),
('LOC_012', 'ROOM_003', 'Zone balance', 'Espace pour les balances de précision', TRUE),

-- Laboratoire de recherche
('LOC_013', 'ROOM_004', 'Paillasse recherche', 'Paillasse pour recherche', TRUE),
('LOC_014', 'ROOM_004', 'Hotte de sécurité', 'Hotte de sécurité avancée', TRUE),
('LOC_015', 'ROOM_004', 'Zone instrumentale', 'Zone pour instruments spécialisés', TRUE),

-- Salle de préparation
('LOC_016', 'ROOM_005', 'Plan de travail', 'Plan de travail principal', TRUE),
('LOC_017', 'ROOM_005', 'Évier', 'Zone de nettoyage', TRUE),
('LOC_018', 'ROOM_005', 'Armoire produits', 'Stockage des produits', TRUE),

-- Amphithéâtre
('LOC_019', 'ROOM_006', 'Estrade', 'Estrade du professeur', TRUE),
('LOC_020', 'ROOM_006', 'Table de démonstration', 'Table pour démonstrations', TRUE);
