-- Migration TimeSlots - Version sécurisée
-- Date: 3 août 2025

SET NAMES utf8mb4;
SET time_zone = '+00:00';
SET foreign_key_checks = 0;

-- Procédure pour ajouter une colonne seulement si elle n'existe pas
DELIMITER $$

-- Supprimer la procédure si elle existe déjà
DROP PROCEDURE IF EXISTS AddColumnIfNotExists$$

CREATE PROCEDURE AddColumnIfNotExists(
    IN tableName VARCHAR(255),
    IN columnName VARCHAR(255),
    IN columnDefinition TEXT
)
BEGIN
    SET @count = (
        SELECT COUNT(*)
        FROM INFORMATION_SCHEMA.COLUMNS
        WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = tableName
        AND COLUMN_NAME = columnName
    );
    
    IF @count = 0 THEN
        SET @sql = CONCAT('ALTER TABLE `', tableName, '` ADD COLUMN `', columnName, '` ', columnDefinition);
        PREPARE stmt FROM @sql;
        EXECUTE stmt;
        DEALLOCATE PREPARE stmt;
    END IF;
END$$

DELIMITER ;

-- Ajouter les colonnes nécessaires pour calendar_chimie
CALL AddColumnIfNotExists('calendar_chimie', 'state', 'enum(\'PENDING\',\'VALIDATED\',\'CANCELLED\',\'MOVED\',\'IN_PROGRESS\') COLLATE utf8mb4_unicode_ci DEFAULT \'PENDING\' AFTER `status`');
CALL AddColumnIfNotExists('calendar_chimie', 'timeSlots', 'JSON NULL AFTER `state`');
CALL AddColumnIfNotExists('calendar_chimie', 'actuelTimeSlots', 'JSON NULL AFTER `timeSlots`');
CALL AddColumnIfNotExists('calendar_chimie', 'stateChangeReason', 'TEXT NULL AFTER `actuelTimeSlots`');
CALL AddColumnIfNotExists('calendar_chimie', 'lastStateChange', 'JSON NULL AFTER `stateChangeReason`');

-- Ajouter les colonnes nécessaires pour calendar_physique
CALL AddColumnIfNotExists('calendar_physique', 'state', 'enum(\'PENDING\',\'VALIDATED\',\'CANCELLED\',\'MOVED\',\'IN_PROGRESS\') COLLATE utf8mb4_unicode_ci DEFAULT \'PENDING\' AFTER `status`');
CALL AddColumnIfNotExists('calendar_physique', 'timeSlots', 'JSON NULL AFTER `state`');
CALL AddColumnIfNotExists('calendar_physique', 'actuelTimeSlots', 'JSON NULL AFTER `timeSlots`');
CALL AddColumnIfNotExists('calendar_physique', 'stateChangeReason', 'TEXT NULL AFTER `actuelTimeSlots`');
CALL AddColumnIfNotExists('calendar_physique', 'lastStateChange', 'JSON NULL AFTER `stateChangeReason`');

-- Ajouter les index s'ils n'existent pas (MySQL compatible)
CALL AddColumnIfNotExists('calendar_chimie', 'idx_state_fake', 'TINYINT(1) DEFAULT 0'); -- Colonne temporaire pour tester l'existence de l'index
ALTER TABLE `calendar_chimie` DROP COLUMN `idx_state_fake`; -- Supprimer la colonne temporaire
-- Ajouter l'index avec gestion d'erreur
SET @sql = 'CREATE INDEX idx_state ON calendar_chimie (state)';
SET @exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'calendar_chimie' AND INDEX_NAME = 'idx_state');
SET @sql = IF(@exists = 0, @sql, 'SELECT "Index idx_state already exists on calendar_chimie" as message');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Même chose pour calendar_physique
CALL AddColumnIfNotExists('calendar_physique', 'idx_state_fake', 'TINYINT(1) DEFAULT 0');
ALTER TABLE `calendar_physique` DROP COLUMN `idx_state_fake`;
SET @sql = 'CREATE INDEX idx_state ON calendar_physique (state)';
SET @exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'calendar_physique' AND INDEX_NAME = 'idx_state');
SET @sql = IF(@exists = 0, @sql, 'SELECT "Index idx_state already exists on calendar_physique" as message');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Migration des données existantes pour calendar_chimie
UPDATE `calendar_chimie` 
SET 
    `timeSlots` = JSON_ARRAY(
        JSON_OBJECT(
            'id', CONCAT('TS_', UNIX_TIMESTAMP(NOW()), '_', SUBSTRING(MD5(RAND()), 1, 7)),
            'startDate', DATE_FORMAT(`start_date`, '%Y-%m-%dT%H:%i:%s.000Z'),
            'endDate', DATE_FORMAT(`end_date`, '%Y-%m-%dT%H:%i:%s.000Z'),
            'status', 'active',
            'createdBy', COALESCE(`created_by`, 'system'),
            'modifiedBy', JSON_ARRAY(
                JSON_OBJECT(
                    'userId', COALESCE(`created_by`, 'system'),
                    'date', DATE_FORMAT(COALESCE(`created_at`, NOW()), '%Y-%m-%dT%H:%i:%s.000Z'),
                    'action', 'created'
                )
            )
        )
    ),
    `actuelTimeSlots` = JSON_ARRAY(
        JSON_OBJECT(
            'id', CONCAT('ATS_', UNIX_TIMESTAMP(NOW()), '_', SUBSTRING(MD5(RAND()), 1, 7)),
            'startDate', DATE_FORMAT(`start_date`, '%Y-%m-%dT%H:%i:%s.000Z'),
            'endDate', DATE_FORMAT(`end_date`, '%Y-%m-%dT%H:%i:%s.000Z'),
            'status', 'active',
            'createdBy', COALESCE(`created_by`, 'system')
        )
    ),
    `lastStateChange` = JSON_OBJECT(
        'from', 'VALIDATED',
        'to', 'VALIDATED',
        'date', DATE_FORMAT(COALESCE(`created_at`, NOW()), '%Y-%m-%dT%H:%i:%s.000Z'),
        'userId', COALESCE(`created_by`, 'system'),
        'reason', 'Migration automatique'
    ),
    `state` = 'VALIDATED'
WHERE `timeSlots` IS NULL;

-- Migration des données existantes pour calendar_physique
UPDATE `calendar_physique` 
SET 
    `timeSlots` = JSON_ARRAY(
        JSON_OBJECT(
            'id', CONCAT('TS_', UNIX_TIMESTAMP(NOW()), '_', SUBSTRING(MD5(RAND()), 1, 7)),
            'startDate', DATE_FORMAT(`start_date`, '%Y-%m-%dT%H:%i:%s.000Z'),
            'endDate', DATE_FORMAT(`end_date`, '%Y-%m-%dT%H:%i:%s.000Z'),
            'status', 'active',
            'createdBy', COALESCE(`created_by`, 'system'),
            'modifiedBy', JSON_ARRAY(
                JSON_OBJECT(
                    'userId', COALESCE(`created_by`, 'system'),
                    'date', DATE_FORMAT(COALESCE(`created_at`, NOW()), '%Y-%m-%dT%H:%i:%s.000Z'),
                    'action', 'created'
                )
            )
        )
    ),
    `actuelTimeSlots` = JSON_ARRAY(
        JSON_OBJECT(
            'id', CONCAT('ATS_', UNIX_TIMESTAMP(NOW()), '_', SUBSTRING(MD5(RAND()), 1, 7)),
            'startDate', DATE_FORMAT(`start_date`, '%Y-%m-%dT%H:%i:%s.000Z'),
            'endDate', DATE_FORMAT(`end_date`, '%Y-%m-%dT%H:%i:%s.000Z'),
            'status', 'active',
            'createdBy', COALESCE(`created_by`, 'system')
        )
    ),
    `lastStateChange` = JSON_OBJECT(
        'from', 'VALIDATED',
        'to', 'VALIDATED',
        'date', DATE_FORMAT(COALESCE(`created_at`, NOW()), '%Y-%m-%dT%H:%i:%s.000Z'),
        'userId', COALESCE(`created_by`, 'system'),
        'reason', 'Migration automatique'
    ),
    `state` = 'VALIDATED'
WHERE `timeSlots` IS NULL;

-- Nettoyer la procédure temporaire
DROP PROCEDURE IF EXISTS AddColumnIfNotExists;

SET foreign_key_checks = 1;

-- Note: Les champs start_date et end_date existants sont conservés pour la compatibilité
-- mais les nouveaux champs timeSlots et actuelTimeSlots sont désormais la source de vérité pour les horaires.
