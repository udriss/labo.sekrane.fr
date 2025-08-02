-- Migration pour ajouter le support des TimeSlots aux tables de calendrier
-- Date: 2 août 2025

SET NAMES utf8mb4;
SET time_zone = '+00:00';
SET foreign_key_checks = 0;

-- Ajouter le champ state pour gérer les états d'événements (PENDING, VALIDATED, CANCELLED, etc.)
ALTER TABLE `calendar_chimie` 
ADD COLUMN `state` enum('PENDING','VALIDATED','CANCELLED','MOVED','IN_PROGRESS') COLLATE utf8mb4_unicode_ci DEFAULT 'PENDING' AFTER `status`;

ALTER TABLE `calendar_physique` 
ADD COLUMN `state` enum('PENDING','VALIDATED','CANCELLED','MOVED','IN_PROGRESS') COLLATE utf8mb4_unicode_ci DEFAULT 'PENDING' AFTER `status`;

-- Ajouter des index pour optimiser les requêtes sur le state
ALTER TABLE `calendar_chimie` ADD KEY `idx_state` (`state`);
ALTER TABLE `calendar_physique` ADD KEY `idx_state` (`state`);

-- Le champ notes existant sera utilisé pour stocker la structure JSON des TimeSlots
-- Structure attendue dans notes:
-- {
--   "timeSlots": [
--     {
--       "id": "TS_timestamp_random",
--       "startDate": "2025-08-02T14:00:00.000Z",
--       "endDate": "2025-08-02T16:00:00.000Z",
--       "status": "active|invalid|deleted",
--       "createdBy": "user_id",
--       "modifiedBy": [
--         {
--           "userId": "user_id",
--           "date": "2025-08-02T12:00:00.000Z",
--           "action": "created|modified|deleted"
--         }
--       ],
--       "referentActuelTimeID": "reference_to_actual_slot_id"
--     }
--   ],
--   "actuelTimeSlots": [
--     {
--       "id": "original_slot_id",
--       "startDate": "2025-08-02T14:00:00.000Z",
--       "endDate": "2025-08-02T16:00:00.000Z",
--       "status": "active",
--       "createdBy": "user_id"
--     }
--   ],
--   "originalRemarks": "text_remarks"
-- }

-- Migration des données existantes : initialiser les TimeSlots pour les événements existants
UPDATE `calendar_chimie` 
SET `notes` = JSON_OBJECT(
    'timeSlots', JSON_ARRAY(
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
    'actuelTimeSlots', JSON_ARRAY(
        JSON_OBJECT(
            'id', CONCAT('TS_', UNIX_TIMESTAMP(NOW()), '_', SUBSTRING(MD5(RAND()), 1, 7)),
            'startDate', DATE_FORMAT(`start_date`, '%Y-%m-%dT%H:%i:%s.000Z'),
            'endDate', DATE_FORMAT(`end_date`, '%Y-%m-%dT%H:%i:%s.000Z'),
            'status', 'active',
            'createdBy', COALESCE(`created_by`, 'system')
        )
    ),
    'originalRemarks', COALESCE(`notes`, '')
)
WHERE `notes` IS NULL OR `notes` = '' OR NOT JSON_VALID(`notes`) OR JSON_EXTRACT(`notes`, '$.timeSlots') IS NULL;

UPDATE `calendar_physique` 
SET `notes` = JSON_OBJECT(
    'timeSlots', JSON_ARRAY(
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
    'actuelTimeSlots', JSON_ARRAY(
        JSON_OBJECT(
            'id', CONCAT('TS_', UNIX_TIMESTAMP(NOW()), '_', SUBSTRING(MD5(RAND()), 1, 7)),
            'startDate', DATE_FORMAT(`start_date`, '%Y-%m-%dT%H:%i:%s.000Z'),
            'endDate', DATE_FORMAT(`end_date`, '%Y-%m-%dT%H:%i:%s.000Z'),
            'status', 'active',
            'createdBy', COALESCE(`created_by`, 'system')
        )
    ),
    'originalRemarks', COALESCE(`notes`, '')
)
WHERE `notes` IS NULL OR `notes` = '' OR NOT JSON_VALID(`notes`) OR JSON_EXTRACT(`notes`, '$.timeSlots') IS NULL;

SET foreign_key_checks = 1;

-- Note: Les champs start_date et end_date existants sont conservés pour la compatibilité
-- mais les TimeSlots dans le champ notes sont désormais la source de vérité pour les horaires.
