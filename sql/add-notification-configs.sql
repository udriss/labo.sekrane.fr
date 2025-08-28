-- Script pour ajouter les nouvelles configurations de notifications

-- Configurations pour le module USERS
INSERT INTO NotificationConfig (module, actionType, name, description, severity, enabled) VALUES
('USERS', 'CREATE', 'Nouvel utilisateur', 'Notification lors de la création d\'un nouvel utilisateur', 'medium', true),
('USERS', 'UPDATE', 'Modification utilisateur', 'Notification lors de la modification des informations d\'un utilisateur', 'low', true),
('USERS', 'DELETE', 'Suppression utilisateur', 'Notification lors de la suppression d\'un utilisateur', 'high', true),
('USERS', 'STATUS', 'Changement de statut', 'Notification lors du changement de rôle ou statut d\'un utilisateur', 'medium', true);

-- Configurations pour le module CHEMICALS (Produits chimiques)
INSERT INTO NotificationConfig (module, actionType, name, description, severity, enabled) VALUES
('CHEMICALS', 'CREATE', 'Nouveau produit chimique', 'Notification lors de l\'ajout d\'un nouveau produit chimique', 'medium', true),
('CHEMICALS', 'UPDATE', 'Modification produit chimique', 'Notification lors de la modification d\'un produit chimique', 'low', true),
('CHEMICALS', 'DELETE', 'Suppression produit chimique', 'Notification lors de la suppression d\'un produit chimique', 'high', true),
('CHEMICALS', 'ALERT', 'Alerte stock faible', 'Alerte lorsque le stock d\'un produit chimique est faible', 'high', true),
('CHEMICALS', 'STATUS', 'Changement de statut', 'Notification lors du changement de statut d\'un produit chimique', 'medium', true);

-- Configurations pour le module MATERIEL (Équipements)
INSERT INTO NotificationConfig (module, actionType, name, description, severity, enabled) VALUES
('MATERIEL', 'CREATE', 'Nouvel équipement', 'Notification lors de l\'ajout d\'un nouvel équipement', 'medium', true),
('MATERIEL', 'UPDATE', 'Modification équipement', 'Notification lors de la modification d\'un équipement', 'low', true),
('MATERIEL', 'DELETE', 'Suppression équipement', 'Notification lors de la suppression d\'un équipement', 'high', true),
('MATERIEL', 'STATUS', 'Changement de statut', 'Notification lors du changement de statut d\'un équipement (maintenance, réparation)', 'medium', true),
('MATERIEL', 'ALERT', 'Alerte maintenance', 'Alerte pour la maintenance préventive d\'un équipement', 'medium', true);

-- Configurations pour le module ROOMS (Salles)
INSERT INTO NotificationConfig (module, actionType, name, description, severity, enabled) VALUES
('ROOMS', 'CREATE', 'Nouvelle salle', 'Notification lors de la création d\'une nouvelle salle', 'low', true),
('ROOMS', 'UPDATE', 'Modification salle', 'Notification lors de la modification d\'une salle', 'low', true),
('ROOMS', 'DELETE', 'Suppression salle', 'Notification lors de la suppression d\'une salle', 'medium', true),
('ROOMS', 'STATUS', 'Changement de disponibilité', 'Notification lors du changement de disponibilité d\'une salle', 'low', true);

-- Configurations pour le module CALENDAR (Calendrier)
INSERT INTO NotificationConfig (module, actionType, name, description, severity, enabled) VALUES
('CALENDAR', 'CREATE', 'Nouvel événement', 'Notification lors de la création d\'un nouvel événement', 'medium', true),
('CALENDAR', 'UPDATE', 'Modification événement', 'Notification lors de la modification d\'un événement', 'medium', true),
('CALENDAR', 'DELETE', 'Suppression événement', 'Notification lors de la suppression d\'un événement', 'medium', true),
('CALENDAR', 'ALERT', 'Rappel événement', 'Rappel avant un événement programmé', 'low', true);

-- Configurations pour le module ORDERS (Commandes)
INSERT INTO NotificationConfig (module, actionType, name, description, severity, enabled) VALUES
('ORDERS', 'CREATE', 'Nouvelle commande', 'Notification lors de la création d\'une nouvelle commande', 'medium', true),
('ORDERS', 'UPDATE', 'Modification commande', 'Notification lors de la modification d\'une commande', 'low', true),
('ORDERS', 'STATUS', 'Changement de statut', 'Notification lors du changement de statut d\'une commande', 'medium', true),
('ORDERS', 'ALERT', 'Commande urgente', 'Alerte pour les commandes urgentes', 'high', true);

-- Configurations pour le module SECURITY (Sécurité)
INSERT INTO NotificationConfig (module, actionType, name, description, severity, enabled) VALUES
('SECURITY', 'ALERT', 'Alerte sécurité', 'Alerte de sécurité importante', 'critical', true),
('SECURITY', 'STATUS', 'Changement de sécurité', 'Notification lors des changements de configuration de sécurité', 'high', true),
('SECURITY', 'REPORT', 'Rapport de sécurité', 'Génération de rapports de sécurité', 'medium', true);

-- Vérifier les configurations existantes pour SYSTEM (si elles n'existent pas déjà)
INSERT IGNORE INTO NotificationConfig (module, actionType, name, description, severity, enabled) VALUES
('SYSTEM', 'ALERT', 'Alerte système', 'Alerte système importante', 'high', true),
('SYSTEM', 'STATUS', 'Changement de statut système', 'Notification lors des changements de statut du système', 'medium', true),
('SYSTEM', 'REPORT', 'Rapport système', 'Génération de rapports système', 'low', true);
