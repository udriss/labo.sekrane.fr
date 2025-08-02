-- Création de la table tp_presets pour remplacer le système JSON
-- Cette table stockera les templates de TP réutilisables

CREATE TABLE IF NOT EXISTS tp_presets (
  id VARCHAR(36) PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  discipline ENUM('chimie', 'physique', 'general') NOT NULL DEFAULT 'general',
  level VARCHAR(100),
  estimated_duration INT, -- en minutes
  difficulty ENUM('facile', 'moyen', 'difficile') DEFAULT 'moyen',
  objectives TEXT,
  prerequisites TEXT,
  safety_notes TEXT,
  materials JSON, -- Liste des matériels requis avec quantités
  chemicals JSON, -- Liste des produits chimiques requis
  protocols JSON, -- Étapes du protocole
  sections JSON, -- Sections éducatives (ex: ["seconde", "premiere"])
  created_by INT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  status ENUM('active', 'archived', 'draft') DEFAULT 'active',
  tags JSON, -- Tags pour faciliter la recherche
  
  INDEX idx_discipline (discipline),
  INDEX idx_level (level),
  INDEX idx_status (status),
  INDEX idx_created_by (created_by),
  INDEX idx_created_at (created_at),
  
  FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
);

-- Création de la table notebook_entries pour remplacer le système JSON
-- Cette table stockera les instances de TP (créées à partir des presets ou manuellement)

CREATE TABLE IF NOT EXISTS notebook_entries (
  id VARCHAR(36) PRIMARY KEY,
  preset_id VARCHAR(36) NULL, -- Référence au preset utilisé (NULL si créé manuellement)
  title VARCHAR(255) NOT NULL,
  description TEXT,
  content TEXT, -- Contenu du TP (peut être différent du preset)
  discipline ENUM('chimie', 'physique', 'general') NOT NULL DEFAULT 'general',
  level VARCHAR(100),
  estimated_duration INT, -- en minutes
  actual_duration INT, -- durée réelle en minutes
  difficulty ENUM('facile', 'moyen', 'difficile') DEFAULT 'moyen',
  objectives TEXT,
  prerequisites TEXT,
  safety_notes TEXT,
  materials JSON, -- Matériels utilisés avec quantités
  chemicals JSON, -- Produits chimiques utilisés
  protocols JSON, -- Protocole suivi
  sections JSON, -- Sections éducatives
  class_group VARCHAR(100), -- Classe concernée
  teacher_id INT,
  student_groups JSON, -- Groupes d'étudiants
  date_performed DATE,
  observations TEXT, -- Observations pendant le TP
  results TEXT, -- Résultats obtenus
  evaluation JSON, -- Évaluation des étudiants
  attachments JSON, -- Fichiers joints
  status ENUM('planned', 'in_progress', 'completed', 'cancelled') DEFAULT 'planned',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  INDEX idx_preset_id (preset_id),
  INDEX idx_discipline (discipline),
  INDEX idx_level (level),
  INDEX idx_teacher_id (teacher_id),
  INDEX idx_date_performed (date_performed),
  INDEX idx_status (status),
  INDEX idx_class_group (class_group),
  INDEX idx_created_at (created_at),
  
  FOREIGN KEY (preset_id) REFERENCES tp_presets(id) ON DELETE SET NULL,
  FOREIGN KEY (teacher_id) REFERENCES users(id) ON DELETE SET NULL
);

-- Insertion de quelques presets d'exemple pour commencer
INSERT INTO tp_presets (id, title, description, discipline, level, estimated_duration, difficulty, objectives, materials, chemicals, protocols, sections, created_by, tags) VALUES 
(
  UUID(),
  'Synthèse de l\'aspirine',
  'Préparation de l\'acide acétylsalicylique par réaction d\'acétylation',
  'chimie',
  'premiere',
  120,
  'moyen',
  'Apprendre les techniques de synthèse organique et la purification des produits',
  JSON_ARRAY(
    JSON_OBJECT('id', 'MAT001', 'nom', 'Ballon à fond rond 250ml', 'quantite', 1),
    JSON_OBJECT('id', 'MAT002', 'nom', 'Réfrigérant à reflux', 'quantite', 1),
    JSON_OBJECT('id', 'MAT003', 'nom', 'Agitateur magnétique', 'quantite', 1)
  ),
  JSON_ARRAY(
    JSON_OBJECT('id', 'CHI001', 'nom', 'Acide salicylique', 'quantite', '2g'),
    JSON_OBJECT('id', 'CHI002', 'nom', 'Anhydride acétique', 'quantite', '3ml'),
    JSON_OBJECT('id', 'CHI003', 'nom', 'Acide phosphorique', 'quantite', 'quelques gouttes')
  ),
  JSON_ARRAY(
    JSON_OBJECT('etape', 1, 'description', 'Peser 2g d\'acide salicylique dans un ballon'),
    JSON_OBJECT('etape', 2, 'description', 'Ajouter 3ml d\'anhydride acétique'),
    JSON_OBJECT('etape', 3, 'description', 'Ajouter quelques gouttes d\'acide phosphorique'),
    JSON_OBJECT('etape', 4, 'description', 'Chauffer à reflux pendant 15 minutes')
  ),
  JSON_ARRAY('premiere', 'terminale'),
  NULL,
  JSON_ARRAY('synthese', 'chimie-organique', 'purification')
),
(
  UUID(),
  'Étude d\'un oscillateur harmonique',
  'Mesure de la période d\'oscillation d\'un pendule simple',
  'physique',
  'seconde',
  60,
  'facile',
  'Vérifier la relation entre période et longueur d\'un pendule',
  JSON_ARRAY(
    JSON_OBJECT('id', 'PHY001', 'nom', 'Pendule simple', 'quantite', 1),
    JSON_OBJECT('id', 'PHY002', 'nom', 'Chronomètre', 'quantite', 1),
    JSON_OBJECT('id', 'PHY003', 'nom', 'Règle graduée', 'quantite', 1)
  ),
  JSON_ARRAY(),
  JSON_ARRAY(
    JSON_OBJECT('etape', 1, 'description', 'Mesurer la longueur du pendule'),
    JSON_OBJECT('etape', 2, 'description', 'Lancer les oscillations'),
    JSON_OBJECT('etape', 3, 'description', 'Mesurer 10 périodes'),
    JSON_OBJECT('etape', 4, 'description', 'Répéter pour différentes longueurs')
  ),
  JSON_ARRAY('seconde'),
  NULL,
  JSON_ARRAY('mecanique', 'oscillations', 'mesures')
);
