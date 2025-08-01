-- Création des tables de calendrier pour chimie et physique

-- Table pour les événements de chimie
CREATE TABLE IF NOT EXISTS calendar_chimie (
  id VARCHAR(36) PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  start_date DATETIME NOT NULL,
  end_date DATETIME NOT NULL,
  description TEXT,
  type ENUM('tp', 'cours', 'exam', 'maintenance', 'reservation', 'other') DEFAULT 'other',
  status ENUM('scheduled', 'in_progress', 'completed', 'cancelled') DEFAULT 'scheduled',
  room VARCHAR(100),
  teacher VARCHAR(100),
  class_name VARCHAR(100),
  participants TEXT, -- JSON array of participant IDs
  equipment_used TEXT, -- JSON array of equipment IDs
  chemicals_used TEXT, -- JSON array of chemical IDs
  notes TEXT,
  color VARCHAR(7) DEFAULT '#1976d2', -- Hex color code
  created_by VARCHAR(36),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  INDEX idx_start_date (start_date),
  INDEX idx_end_date (end_date),
  INDEX idx_type (type),
  INDEX idx_status (status),
  INDEX idx_room (room),
  INDEX idx_teacher (teacher),
  INDEX idx_class_name (class_name)
);

-- Table pour les événements de physique (structure identique mais séparée)
CREATE TABLE IF NOT EXISTS calendar_physique (
  id VARCHAR(36) PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  start_date DATETIME NOT NULL,
  end_date DATETIME NOT NULL,
  description TEXT,
  type ENUM('tp', 'cours', 'exam', 'maintenance', 'reservation', 'other') DEFAULT 'other',
  status ENUM('scheduled', 'in_progress', 'completed', 'cancelled') DEFAULT 'scheduled',
  room VARCHAR(100),
  teacher VARCHAR(100),
  class_name VARCHAR(100),
  participants TEXT, -- JSON array of participant IDs
  equipment_used TEXT, -- JSON array of equipment IDs
  chemicals_used TEXT, -- JSON array of chemical IDs
  notes TEXT,
  color VARCHAR(7) DEFAULT '#1976d2', -- Hex color code
  created_by VARCHAR(36),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  INDEX idx_start_date (start_date),
  INDEX idx_end_date (end_date),
  INDEX idx_type (type),
  INDEX idx_status (status),
  INDEX idx_room (room),
  INDEX idx_teacher (teacher),
  INDEX idx_class_name (class_name)
);

-- Données d'exemple pour la chimie
INSERT INTO calendar_chimie (id, title, start_date, end_date, description, type, room, teacher, class_name, color) VALUES
('chem-1', 'TP Chimie Organique', '2025-08-05 08:00:00', '2025-08-05 12:00:00', 'Synthèse de l\'aspirine', 'tp', 'Labo Chimie A', 'Dr. Martin', 'L2 Chimie', '#4caf50'),
('chem-2', 'Cours Thermodynamique', '2025-08-06 14:00:00', '2025-08-06 16:00:00', 'Introduction aux lois de la thermodynamique', 'cours', 'Amphi 1', 'Prof. Dubois', 'L1 Sciences', '#2196f3'),
('chem-3', 'Examen Chimie Analytique', '2025-08-08 09:00:00', '2025-08-08 11:00:00', 'Examen de mi-semestre', 'exam', 'Salle Examen', 'Dr. Leroy', 'L3 Chimie', '#f44336'),
('chem-4', 'Maintenance Spectromètre', '2025-08-10 10:00:00', '2025-08-10 12:00:00', 'Maintenance préventive du spectromètre IR', 'maintenance', 'Labo Analyse', 'Technicien', '', '#ff9800'),
('chem-5', 'TP Cinétique Chimique', '2025-08-12 08:00:00', '2025-08-12 12:00:00', 'Étude de la vitesse de réaction', 'tp', 'Labo Chimie B', 'Dr. Martin', 'L2 Chimie', '#4caf50');

-- Données d'exemple pour la physique
INSERT INTO calendar_physique (id, title, start_date, end_date, description, type, room, teacher, class_name, color) VALUES
('phys-1', 'TP Mécanique', '2025-08-05 14:00:00', '2025-08-05 18:00:00', 'Étude du mouvement pendulaire', 'tp', 'Labo Physique A', 'Prof. Rousseau', 'L1 Physique', '#9c27b0'),
('phys-2', 'Cours Électromagnétisme', '2025-08-06 10:00:00', '2025-08-06 12:00:00', 'Lois de Maxwell', 'cours', 'Amphi 2', 'Dr. Moreau', 'L2 Physique', '#673ab7'),
('phys-3', 'TP Optique', '2025-08-07 08:00:00', '2025-08-07 12:00:00', 'Interférences et diffraction', 'tp', 'Labo Optique', 'Prof. Rousseau', 'L2 Physique', '#9c27b0'),
('phys-4', 'Maintenance Oscilloscope', '2025-08-09 14:00:00', '2025-08-09 16:00:00', 'Calibration oscilloscope numérique', 'maintenance', 'Labo Électronique', 'Technicien', '', '#ff5722'),
('phys-5', 'Examen Mécanique Quantique', '2025-08-11 09:00:00', '2025-08-11 12:00:00', 'Examen final', 'exam', 'Salle Examen', 'Dr. Moreau', 'M1 Physique', '#f44336');
