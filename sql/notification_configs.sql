SET NAMES utf8mb4;
SET time_zone = '+00:00';
SET foreign_key_checks = 0;
SET sql_mode = 'NO_AUTO_VALUE_ON_ZERO';

-- Utiliser la base de données
USE `labo`;

-- Table pour stocker les configurations de notifications
DROP TABLE IF EXISTS `notification_configs`;
CREATE TABLE `notification_configs` (
  `id` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `module` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `action_type` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `name` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `description` text COLLATE utf8mb4_unicode_ci,
  `severity` enum('low','medium','high','critical') COLLATE utf8mb4_unicode_ci DEFAULT 'medium',
  `enabled` tinyint(1) DEFAULT '1',
  `default_roles` json DEFAULT NULL COMMENT 'Rôles pour lesquels cette notification est activée par défaut',
  `metadata` json DEFAULT NULL COMMENT 'Données supplémentaires pour la configuration',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_module_action` (`module`,`action_type`),
  KEY `idx_module` (`module`),
  KEY `idx_action_type` (`action_type`),
  KEY `idx_severity` (`severity`),
  KEY `idx_enabled` (`enabled`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Configuration des types de notifications disponibles';

-- Table améliorée pour les préférences utilisateur
DROP TABLE IF EXISTS `notification_preferences`;
CREATE TABLE `notification_preferences` (
  `id` int NOT NULL AUTO_INCREMENT,
  `user_id` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `user_role` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `module` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `action_type` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `enabled` tinyint(1) DEFAULT '1',
  `custom_settings` json DEFAULT NULL COMMENT 'Paramètres personnalisés pour cette préférence',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_user_module_action` (`user_id`,`module`,`action_type`),
  KEY `idx_user_id` (`user_id`),
  KEY `idx_user_role` (`user_role`),
  KEY `idx_module` (`module`),
  KEY `idx_action_type` (`action_type`),
  KEY `idx_enabled` (`enabled`),
  CONSTRAINT `fk_notification_preferences_config` FOREIGN KEY (`module`, `action_type`) REFERENCES `notification_configs` (`module`, `action_type`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Préférences de notifications par utilisateur';

-- Table pour l'historique des notifications envoyées
DROP TABLE IF EXISTS `notification_history`;
CREATE TABLE `notification_history` (
  `id` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `config_id` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `recipient_user_id` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `recipient_role` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `title` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `message` json NOT NULL COMMENT 'Message multilingue',
  `details` text COLLATE utf8mb4_unicode_ci,
  `severity` enum('low','medium','high','critical') COLLATE utf8mb4_unicode_ci DEFAULT 'medium',
  `status` enum('pending','sent','delivered','failed','read') COLLATE utf8mb4_unicode_ci DEFAULT 'pending',
  `delivery_channel` enum('in_app','email','sms','push') COLLATE utf8mb4_unicode_ci DEFAULT 'in_app',
  `metadata` json DEFAULT NULL COMMENT 'Métadonnées liées à l\'entité concernée',
  `sent_at` timestamp NULL DEFAULT NULL,
  `delivered_at` timestamp NULL DEFAULT NULL,
  `read_at` timestamp NULL DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_config_id` (`config_id`),
  KEY `idx_recipient_user_id` (`recipient_user_id`),
  KEY `idx_recipient_role` (`recipient_role`),
  KEY `idx_status` (`status`),
  KEY `idx_severity` (`severity`),
  KEY `idx_created_at` (`created_at`),
  KEY `idx_sent_at` (`sent_at`),
  KEY `idx_read_at` (`read_at`),
  CONSTRAINT `fk_notification_history_config` FOREIGN KEY (`config_id`) REFERENCES `notification_configs` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Historique des notifications envoyées';

-- Index supplémentaires pour les performances
CREATE INDEX `idx_notification_history_unread` ON `notification_history` (`recipient_user_id`, `status`, `created_at`);
CREATE INDEX `idx_notification_preferences_role_enabled` ON `notification_preferences` (`user_role`, `enabled`);
