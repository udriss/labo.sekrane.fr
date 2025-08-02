-- Ajouter une colonne is_deleted à la table notification_read_status
-- pour traquer les notifications supprimées par les utilisateurs

USE labo;

-- Ajouter la colonne is_deleted si elle n'existe pas déjà
ALTER TABLE notification_read_status 
ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN DEFAULT FALSE 
AFTER is_read;

-- Mettre à jour l'index pour inclure is_deleted
-- DROP INDEX IF EXISTS idx_notification_user ON notification_read_status;
-- CREATE INDEX idx_notification_user_deleted ON notification_read_status (notification_id, user_id, is_read, is_deleted);

-- Vérifier la structure mise à jour
DESCRIBE notification_read_status;
