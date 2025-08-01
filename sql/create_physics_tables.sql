-- Créer les tables pour le système physique (miroir du système chimie)

-- ================================================
-- TABLES POUR PHYSICS (PHYSIQUE)
-- ================================================

-- Table des types de consommables physiques (équivalent de chemical_categories)
CREATE TABLE IF NOT EXISTS physics_consumable_types (
  id VARCHAR(50) PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  color VARCHAR(7) DEFAULT '#1976d2',
  icon VARCHAR(255) DEFAULT 'category',
  isActive BOOLEAN DEFAULT TRUE,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY unique_physics_consumable_type_name (name)
);

-- Table des consommables physiques prédéfinis (équivalent de chemicals)
CREATE TABLE IF NOT EXISTS physics_consumable_items (
  id VARCHAR(50) PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  physics_consumable_type_id VARCHAR(50),
  model VARCHAR(255),
  brand VARCHAR(255),
  specifications JSON,
  unit ENUM('piece', 'pieces', 'kg', 'g', 'mg', 'L', 'mL', 'm', 'cm', 'mm') DEFAULT 'pieces',
  isActive BOOLEAN DEFAULT TRUE,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (physics_consumable_type_id) REFERENCES physics_consumable_types(id),
  UNIQUE KEY unique_physics_consumable_name_type (name, physics_consumable_type_id)
);

-- Table d'inventaire des consommables physiques (équivalent de chemicals_inventory)
CREATE TABLE IF NOT EXISTS physics_consumables (
  id VARCHAR(50) PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  physics_consumable_type_id VARCHAR(50),
  physics_consumable_item_id VARCHAR(50),
  barcode VARCHAR(255) UNIQUE,
  quantity DECIMAL(10,3) NOT NULL DEFAULT 0,
  unit ENUM('piece', 'pieces', 'kg', 'g', 'mg', 'L', 'mL', 'm', 'cm', 'mm') DEFAULT 'pieces',
  minQuantity DECIMAL(10,3) DEFAULT 0,
  brand VARCHAR(255),
  model VARCHAR(255),
  specifications TEXT,
  purchaseDate DATE,
  expirationDate DATE,
  storage TEXT,
  room VARCHAR(255),
  location VARCHAR(255),
  status ENUM('IN_STOCK', 'LOW_STOCK', 'OUT_OF_STOCK', 'EXPIRED', 'EMPTY') DEFAULT 'IN_STOCK',
  supplierId VARCHAR(36),
  batchNumber VARCHAR(255),
  orderReference VARCHAR(255),
  notes TEXT,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (physics_consumable_type_id) REFERENCES physics_consumable_types(id),
  FOREIGN KEY (physics_consumable_item_id) REFERENCES physics_consumable_items(id),
  FOREIGN KEY (supplierId) REFERENCES suppliers(id),
  INDEX idx_physics_consumables_type (physics_consumable_type_id),
  INDEX idx_physics_consumables_item (physics_consumable_item_id),
  INDEX idx_physics_consumables_status (status),
  INDEX idx_physics_consumables_room (room)
);

-- Table des types d'équipement physique (équivalent de chimie_equipment_types)
CREATE TABLE IF NOT EXISTS physics_equipment_types (
  id VARCHAR(50) PRIMARY KEY,
  name VARCHAR(255) NOT NULL UNIQUE,
  description TEXT,
  color VARCHAR(7) DEFAULT '#4caf50',
  svg VARCHAR(255) DEFAULT '/svg/default.svg',
  isActive BOOLEAN DEFAULT TRUE,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Table des modèles d'équipement physique (équivalent de chimie_equipment_items)
CREATE TABLE IF NOT EXISTS physics_equipment_items (
  id VARCHAR(50) PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  physics_equipment_type_id VARCHAR(50) NOT NULL,
  description TEXT,
  brand VARCHAR(255),
  model VARCHAR(255),
  specifications JSON,
  volumes JSON,
  svg VARCHAR(255) DEFAULT '/svg/default.svg',
  isActive BOOLEAN DEFAULT TRUE,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (physics_equipment_type_id) REFERENCES physics_equipment_types(id),
  UNIQUE KEY unique_physics_equipment_name_type (name, physics_equipment_type_id)
);

-- Table d'inventaire des équipements physiques (équivalent de equipment)
CREATE TABLE IF NOT EXISTS physics_equipment (
  id VARCHAR(50) PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  physics_equipment_type_id VARCHAR(50),
  physics_equipment_item_id VARCHAR(50),
  model VARCHAR(255),
  serial_number VARCHAR(255),
  barcode VARCHAR(255) UNIQUE,
  quantity INT NOT NULL DEFAULT 1,
  min_quantity INT DEFAULT 1,
  volume VARCHAR(50),
  location VARCHAR(255),
  room VARCHAR(255),
  status ENUM('AVAILABLE', 'IN_USE', 'MAINTENANCE', 'OUT_OF_ORDER', 'RESERVED') DEFAULT 'AVAILABLE',
  purchase_date DATE,
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (physics_equipment_type_id) REFERENCES physics_equipment_types(id),
  FOREIGN KEY (physics_equipment_item_id) REFERENCES physics_equipment_items(id),
  INDEX idx_physics_equipment_type (physics_equipment_type_id),
  INDEX idx_physics_equipment_item (physics_equipment_item_id),
  INDEX idx_physics_equipment_status (status),
  INDEX idx_physics_equipment_room (room)
);

-- ================================================
-- INSERTION DES DONNÉES DE TEST POUR PHYSIQUE
-- ================================================

-- Insérer les types de consommables physiques
INSERT IGNORE INTO physics_consumable_types (id, name, description, color, icon) VALUES
('ELECTRONICS', 'Électronique', 'Composants électroniques et circuits', '#2196f3', 'memory'),
('OPTICS', 'Optique', 'Lentilles, miroirs et composants optiques', '#9c27b0', 'visibility'),
('MECHANICS', 'Mécanique', 'Pièces mécaniques et outils', '#795548', 'build'),
('MEASUREMENT', 'Mesure', 'Instruments et capteurs de mesure', '#ff5722', 'speed'),
('MATERIALS', 'Matériaux', 'Matériaux de base et échantillons', '#607d8b', 'layers');

-- Insérer les consommables physiques prédéfinis
INSERT IGNORE INTO physics_consumable_items (id, name, physics_consumable_type_id, description, unit) VALUES
-- Électronique
('ELEC_RES_001', 'Résistances 1kΩ', 'ELECTRONICS', 'Résistances carbone 1/4W 1kΩ ±5%', 'pieces'),
('ELEC_CAP_001', 'Condensateurs 100μF', 'ELECTRONICS', 'Condensateurs électrolytiques 100μF 25V', 'pieces'),
('ELEC_LED_001', 'LEDs rouges 5mm', 'ELECTRONICS', 'Diodes électroluminescentes rouges 5mm', 'pieces'),
('ELEC_IC_001', 'Arduino Uno R3', 'ELECTRONICS', 'Microcontrôleur Arduino Uno R3', 'pieces'),

-- Optique
('OPT_LENS_001', 'Lentilles convergentes f=10cm', 'OPTICS', 'Lentilles biconvexes focale 10cm diamètre 5cm', 'pieces'),
('OPT_LENS_002', 'Lentilles divergentes f=-15cm', 'OPTICS', 'Lentilles biconcaves focale -15cm diamètre 5cm', 'pieces'),
('OPT_PRISM_001', 'Prismes en verre', 'OPTICS', 'Prismes triangulaires en verre optique', 'pieces'),
('OPT_MIRROR_001', 'Miroirs plans 10x10cm', 'OPTICS', 'Miroirs plans métallisés 10x10cm', 'pieces'),

-- Mécanique
('MECH_SPRING_001', 'Ressorts de compression', 'MECHANICS', 'Ressorts hélicoïdaux k=100N/m', 'pieces'),
('MECH_PULLEY_001', 'Poulies simples', 'MECHANICS', 'Poulies en plastique diamètre 5cm', 'pieces'),
('MECH_MASS_001', 'Masses marquées 100g', 'MECHANICS', 'Masses étalonnées en laiton 100g', 'pieces'),
('MECH_RAIL_001', 'Rails de guidage 1m', 'MECHANICS', 'Rails aluminium pour chariot 1m', 'pieces'),

-- Mesure
('MEAS_THERMO_001', 'Thermomètres -10/+110°C', 'MEASUREMENT', 'Thermomètres à alcool précision ±1°C', 'pieces'),
('MEAS_RÈGLE_001', 'Règles graduées 50cm', 'MEASUREMENT', 'Règles en acier inox graduées 50cm', 'pieces'),
('MEAS_CHRONO_001', 'Chronomètres digitaux', 'MEASUREMENT', 'Chronomètres numériques précision 0.01s', 'pieces'),
('MEAS_VOLTM_001', 'Voltmètres analogiques', 'MEASUREMENT', 'Voltmètres analogiques 0-15V', 'pieces');

-- Insérer les types d'équipement physique
INSERT IGNORE INTO physics_equipment_types (id, name, description, color) VALUES
('OSCILLOSCOPES', 'Oscilloscopes', 'Instruments de mesure des signaux électriques', '#3f51b5'),
('GENERATORS', 'Générateurs', 'Générateurs de signaux et alimentations', '#ff9800'),
('OPTICAL_BENCH', 'Bancs optiques', 'Bancs et supports pour expériences d\'optique', '#8bc34a'),
('MECHANICAL_SYSTEMS', 'Systèmes mécaniques', 'Dispositifs pour mécanique et dynamique', '#795548'),
('MEASUREMENT_DEVICES', 'Appareils de mesure', 'Instruments de mesure physique', '#f44336');

-- Insérer les modèles d'équipement physique
INSERT IGNORE INTO physics_equipment_items (id, name, physics_equipment_type_id, description) VALUES
-- Oscilloscopes
('OSC_BASIC_001', 'Oscilloscope 2 voies 50MHz', 'OSCILLOSCOPES', 'Oscilloscope numérique 2 voies 50MHz'),
('OSC_ADV_001', 'Oscilloscope 4 voies 100MHz', 'OSCILLOSCOPES', 'Oscilloscope numérique 4 voies 100MHz avec analyseur'),

-- Générateurs
('GEN_FUNC_001', 'Générateur de fonctions 10MHz', 'GENERATORS', 'Générateur de fonctions sinusoïdales, carrées, triangulaires'),
('GEN_ALIM_001', 'Alimentation stabilisée 0-30V', 'GENERATORS', 'Alimentation variable stabilisée 0-30V 3A'),

-- Bancs optiques
('OPT_BENCH_001', 'Banc optique 1m', 'OPTICAL_BENCH', 'Banc optique avec règle graduée 1m'),
('OPT_LASER_001', 'Laser He-Ne 5mW', 'OPTICAL_BENCH', 'Laser hélium-néon 632.8nm 5mW'),

-- Systèmes mécaniques
('MECH_PENDULE_001', 'Pendule simple réglable', 'MECHANICAL_SYSTEMS', 'Pendule à longueur variable 20cm-1m'),
('MECH_CHARIOT_001', 'Chariot sur coussin d\'air', 'MECHANICAL_SYSTEMS', 'Chariot à coussin d\'air pour rails'),

-- Appareils de mesure
('MEAS_FORCE_001', 'Dynamomètre 0-10N', 'MEASUREMENT_DEVICES', 'Dynamomètre à ressort 0-10N précision ±0.1N'),
('MEAS_BALANCE_001', 'Balance de précision 0.1g', 'MEASUREMENT_DEVICES', 'Balance électronique précision 0.1g');

-- Insérer quelques consommables physiques en stock
INSERT IGNORE INTO physics_consumables (id, name, physics_consumable_type_id, physics_consumable_item_id, quantity, unit, room, location, status) VALUES
('PHYS_CONS_001', 'Résistances 1kΩ', 'ELECTRONICS', 'ELEC_RES_001', 50, 'pieces', 'Laboratoire de Physique A', 'Armoire Électronique', 'IN_STOCK'),
('PHYS_CONS_002', 'Condensateurs 100μF', 'ELECTRONICS', 'ELEC_CAP_001', 25, 'pieces', 'Laboratoire de Physique A', 'Armoire Électronique', 'IN_STOCK'),
('PHYS_CONS_003', 'LEDs rouges 5mm', 'ELECTRONICS', 'ELEC_LED_001', 100, 'pieces', 'Laboratoire de Physique A', 'Armoire Électronique', 'IN_STOCK'),
('PHYS_CONS_004', 'Lentilles convergentes f=10cm', 'OPTICS', 'OPT_LENS_001', 15, 'pieces', 'Laboratoire de Physique B', 'Banc Optique', 'IN_STOCK'),
('PHYS_CONS_005', 'Prismes en verre', 'OPTICS', 'OPT_PRISM_001', 8, 'pieces', 'Laboratoire de Physique B', 'Banc Optique', 'LOW_STOCK'),
('PHYS_CONS_006', 'Ressorts de compression', 'MECHANICS', 'MECH_SPRING_001', 20, 'pieces', 'Laboratoire de Physique C', 'Établi Mécanique', 'IN_STOCK'),
('PHYS_CONS_007', 'Masses marquées 100g', 'MECHANICS', 'MECH_MASS_001', 12, 'pieces', 'Laboratoire de Physique C', 'Établi Mécanique', 'IN_STOCK'),
('PHYS_CONS_008', 'Thermomètres -10/+110°C', 'MEASUREMENT', 'MEAS_THERMO_001', 6, 'pieces', 'Laboratoire de Physique A', 'Armoire Mesure', 'LOW_STOCK');

-- Insérer quelques équipements physiques
INSERT IGNORE INTO physics_equipment (id, name, physics_equipment_type_id, physics_equipment_item_id, quantity, room, location, status) VALUES
('PHYS_EQUIP_001', 'Oscilloscope 2 voies 50MHz', 'OSCILLOSCOPES', 'OSC_BASIC_001', 3, 'Laboratoire de Physique A', 'Paillasse Électronique', 'AVAILABLE'),
('PHYS_EQUIP_002', 'Oscilloscope 4 voies 100MHz', 'OSCILLOSCOPES', 'OSC_ADV_001', 1, 'Laboratoire de Physique A', 'Paillasse Électronique', 'AVAILABLE'),
('PHYS_EQUIP_003', 'Générateur de fonctions 10MHz', 'GENERATORS', 'GEN_FUNC_001', 4, 'Laboratoire de Physique A', 'Paillasse Électronique', 'AVAILABLE'),
('PHYS_EQUIP_004', 'Alimentation stabilisée 0-30V', 'GENERATORS', 'GEN_ALIM_001', 5, 'Laboratoire de Physique A', 'Paillasse Électronique', 'AVAILABLE'),
('PHYS_EQUIP_005', 'Banc optique 1m', 'OPTICAL_BENCH', 'OPT_BENCH_001', 2, 'Laboratoire de Physique B', 'Table Optique', 'AVAILABLE'),
('PHYS_EQUIP_006', 'Laser He-Ne 5mW', 'OPTICAL_BENCH', 'OPT_LASER_001', 1, 'Laboratoire de Physique B', 'Table Optique', 'MAINTENANCE'),
('PHYS_EQUIP_007', 'Pendule simple réglable', 'MECHANICAL_SYSTEMS', 'MECH_PENDULE_001', 6, 'Laboratoire de Physique C', 'Support Mécanique', 'AVAILABLE'),
('PHYS_EQUIP_008', 'Chariot sur coussin d\'air', 'MECHANICAL_SYSTEMS', 'MECH_CHARIOT_001', 4, 'Laboratoire de Physique C', 'Rail de guidage', 'AVAILABLE'),
('PHYS_EQUIP_009', 'Dynamomètre 0-10N', 'MEASUREMENT_DEVICES', 'MEAS_FORCE_001', 8, 'Laboratoire de Physique C', 'Établi Mesure', 'AVAILABLE'),
('PHYS_EQUIP_010', 'Balance de précision 0.1g', 'MEASUREMENT_DEVICES', 'MEAS_BALANCE_001', 2, 'Laboratoire de Physique A', 'Paillasse Mesure', 'AVAILABLE');

-- ================================================
-- TABLE DE CONFIGURATION DES DISCIPLINES
-- ================================================

-- Table pour gérer le choix entre chimie et physique
CREATE TABLE IF NOT EXISTS discipline_config (
  id INT PRIMARY KEY AUTO_INCREMENT,
  userId VARCHAR(36) NOT NULL,
  defaultDiscipline ENUM('chemistry', 'physics') DEFAULT 'chemistry',
  allowDisciplineSwitch BOOLEAN DEFAULT TRUE,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY unique_user_discipline (userId)
);

-- ================================================
-- INDEX ET OPTIMISATIONS
-- ================================================

-- Index pour améliorer les performances
CREATE INDEX idx_physics_consumables_search ON physics_consumables(name, status);
CREATE INDEX idx_physics_equipment_search ON physics_equipment(name, status);
CREATE INDEX idx_physics_consumables_expiration ON physics_consumables(expirationDate);
CREATE INDEX idx_physics_equipment_maintenance ON physics_equipment(status, updated_at);

-- ================================================
-- PROCÉDURES POUR STATISTIQUES PHYSIQUE
-- ================================================

DELIMITER //

CREATE PROCEDURE IF NOT EXISTS GetPhysicsConsumableStats()
BEGIN
    SELECT 
        COUNT(*) as total,
        SUM(CASE WHEN status = 'IN_STOCK' THEN 1 ELSE 0 END) as inStock,
        SUM(CASE WHEN status = 'LOW_STOCK' THEN 1 ELSE 0 END) as lowStock,
        SUM(CASE WHEN status = 'OUT_OF_STOCK' THEN 1 ELSE 0 END) as outOfStock,
        SUM(CASE WHEN status = 'EXPIRED' THEN 1 ELSE 0 END) as expired,
        SUM(CASE WHEN expirationDate <= DATE_ADD(NOW(), INTERVAL 30 DAY) AND expirationDate > NOW() THEN 1 ELSE 0 END) as expiringSoon
    FROM physics_consumables;
END //

CREATE PROCEDURE IF NOT EXISTS GetPhysicsEquipmentStats()
BEGIN
    SELECT 
        COUNT(*) as total,
        SUM(CASE WHEN status = 'AVAILABLE' THEN 1 ELSE 0 END) as available,
        SUM(CASE WHEN status = 'IN_USE' THEN 1 ELSE 0 END) as inUse,
        SUM(CASE WHEN status = 'MAINTENANCE' THEN 1 ELSE 0 END) as maintenance,
        SUM(CASE WHEN status = 'OUT_OF_ORDER' THEN 1 ELSE 0 END) as outOfOrder,
        SUM(CASE WHEN status = 'RESERVED' THEN 1 ELSE 0 END) as reserved
    FROM physics_equipment;
END //

DELIMITER ;

-- Message de confirmation
SELECT 'Tables physique créées avec succès. Données de test insérées.' as status;
