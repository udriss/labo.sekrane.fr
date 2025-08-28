-- Consolidated initial migration (squashed) reflecting final schema

-- Users
CREATE TABLE `Utilisateur` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `email` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NULL,
    `password` VARCHAR(191) NULL,
    `role` ENUM('ADMIN','ADMINLABO','ENSEIGNANT','LABORANTIN_PHYSIQUE','LABORANTIN_CHIMIE','ELEVE') NOT NULL DEFAULT 'ELEVE',
    `lockedUntil` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    UNIQUE INDEX `Utilisateur_email_key`(`email`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `Classe` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(191) NOT NULL,
    `system` BOOLEAN NOT NULL DEFAULT false,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `ClasseUtilisateur` (
    `userId` INTEGER NOT NULL,
    `classId` INTEGER NOT NULL,
    PRIMARY KEY (`userId`,`classId`),
    INDEX `ClasseUtilisateur_classId_fkey`(`classId`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `Evenement` (
        `id` INTEGER NOT NULL AUTO_INCREMENT,
        `title` VARCHAR(191) NOT NULL,
        `discipline` VARCHAR(191) NOT NULL,
        `ownerId` INTEGER NOT NULL,
        `notes` VARCHAR(191) NULL,
        `type` VARCHAR(32) NULL,
        `classIds` JSON NULL,
        `salleIds` JSON NULL,
        `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
        `updatedAt` DATETIME(3) NOT NULL,
        INDEX `Evenement_ownerId_fkey`(`ownerId`),
        PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

        -- Backfill heuristic for initial data (if any rows pre-loaded by seed after creation)
        UPDATE `Evenement`
        SET `type` = CASE
            WHEN LOWER(title) LIKE '%labor%' AND discipline = 'physique' THEN 'LABORANTIN_PHYSIQUE'
            WHEN LOWER(title) LIKE '%labor%' AND discipline = 'chimie' THEN 'LABORANTIN_CHIMIE'
            ELSE 'TP'
        END
        WHERE `type` IS NULL;

CREATE TABLE `Creneau` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `eventId` INTEGER NOT NULL,
    `discipline` VARCHAR(191) NOT NULL,
    `userId` INTEGER NULL,
    `eventOwner` INTEGER NULL,
    `timeslotParent` INTEGER NULL,
    `state` VARCHAR(191) NOT NULL DEFAULT 'created',
    `startDate` DATETIME(3) NOT NULL,
    `endDate` DATETIME(3) NOT NULL,
    `timeslotDate` DATETIME(3) NULL,
    `proposedStartDate` DATETIME(3) NULL,
    `proposedEndDate` DATETIME(3) NULL,
    `proposedTimeslotDate` DATETIME(3) NULL,
    `proposedUserId` INTEGER NULL,
    `proposedNotes` VARCHAR(191) NULL,
    `salleIds` JSON NULL,
    `classIds` JSON NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    INDEX `Creneau_eventId_fkey`(`eventId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `Salle` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(191) NOT NULL,
    `description` VARCHAR(191) NULL,
    `batiment` VARCHAR(191) NULL,
    `placesDisponibles` INTEGER NULL,
    `userOwnerId` INTEGER NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    UNIQUE INDEX `Salle_name_key`(`name`),
    INDEX `Salle_userOwnerId_fkey`(`userOwnerId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `Localisation` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(191) NOT NULL,
    `description` VARCHAR(191) NULL,
    `salleId` INTEGER NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    UNIQUE INDEX `Localisation_salleId_name_key`(`salleId`,`name`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `MaterielCategorie` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(191) NOT NULL,
    `discipline` VARCHAR(64) NOT NULL,
    `description` VARCHAR(255) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    UNIQUE INDEX `MaterielCategorie_name_discipline_key`(`name`,`discipline`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `MaterielPreset` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(191) NOT NULL,
    `category` VARCHAR(191) NULL,
    `discipline` VARCHAR(64) NOT NULL,
    `description` VARCHAR(255) NULL,
    `defaultQty` INTEGER NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `categoryId` INTEGER NULL,
    UNIQUE INDEX `MaterielPreset_name_discipline_key`(`name`,`discipline`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `MaterielPerso` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(191) NOT NULL,
    `discipline` VARCHAR(64) NOT NULL,
    `description` VARCHAR(255) NULL,
    `caracteristiques` JSON NULL,
    `defaultQty` INTEGER NULL,
    `volumes` JSON NULL,
    `categorieId` INTEGER NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    INDEX `MaterielPerso_categorieId_fkey`(`categorieId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `MaterielInventaire` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `discipline` VARCHAR(191) NOT NULL DEFAULT 'Aucune',
    `name` VARCHAR(191) NOT NULL,
    `categoryId` INTEGER NULL,
    `quantity` INTEGER NOT NULL DEFAULT 0,
    `minStock` INTEGER NULL DEFAULT NULL,
    `model` VARCHAR(191) NULL,
    `serialNumber` VARCHAR(191) NULL,
    `supplier` VARCHAR(191) NULL,
    `purchaseDate` DATETIME(3) NULL,
    `notes` VARCHAR(191) NULL,
    `salleId` INTEGER NULL,
    `localisationId` INTEGER NULL,
    `materielPersoId` INTEGER NULL,
    `materielPresetId` INTEGER NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    INDEX `MaterielInventaire_categoryId_fkey`(`categoryId`),
    INDEX `MaterielInventaire_localisationId_fkey`(`localisationId`),
    INDEX `MaterielInventaire_salleId_fkey`(`salleId`),
    INDEX `MaterielInventaire_materielPersoId_fkey`(`materielPersoId`),
    INDEX `MaterielInventaire_materielPresetId_fkey`(`materielPresetId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `ReactifPreset` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(191) NOT NULL,
    `formula` VARCHAR(191) NULL,
    `casNumber` VARCHAR(191) NULL,
    `category` VARCHAR(191) NULL,
    `hazardClass` VARCHAR(191) NULL,
    `molarMass` DOUBLE NULL,
    `density` DOUBLE NULL,
    `boilingPointC` DOUBLE NULL,
    `meltingPointC` DOUBLE NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    UNIQUE INDEX `ReactifPreset_name_casNumber_key`(`name`,`casNumber`),
    UNIQUE INDEX `ReactifPreset_casNumber_key`(`casNumber`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `Supplier` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(191) NOT NULL,
    `contactEmail` VARCHAR(191) NULL,
    `phone` VARCHAR(64) NULL,
    `address` VARCHAR(255) NULL,
    `notes` VARCHAR(191) NULL,
    `kind` VARCHAR(16) NOT NULL DEFAULT 'NORMAL',
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    UNIQUE INDEX `Supplier_name_key`(`name`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `ReactifInventaire` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `reactifPresetId` INTEGER NOT NULL,
    `stock` DOUBLE NOT NULL DEFAULT 0,
    `salleId` INTEGER NULL,
    `localisationId` INTEGER NULL,
    `unit` VARCHAR(32) NULL,
    `minStock` DOUBLE NULL DEFAULT NULL,
    `purchaseDate` DATETIME(3) NULL,
    `expirationDate` DATETIME(3) NULL,
    `notes` VARCHAR(191) NULL,
    `supplierId` INTEGER NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    INDEX `ReactifInventaire_reactifPresetId_idx`(`reactifPresetId`),
    INDEX `ReactifInventaire_salleId_idx`(`salleId`),
    INDEX `ReactifInventaire_localisationId_idx`(`localisationId`),
    INDEX `ReactifInventaire_supplierId_idx`(`supplierId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `Consommable` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(191) NOT NULL,
    `stock` INTEGER NOT NULL DEFAULT 0,
    `unit` VARCHAR(191) NULL,
    `salleId` INTEGER NULL,
    `localisationId` INTEGER NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    INDEX `Consommable_localisationId_fkey`(`localisationId`),
    INDEX `Consommable_salleId_fkey`(`salleId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `Notification` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `uuid` VARCHAR(191) NOT NULL,
    `module` VARCHAR(64) NOT NULL,
    `actionType` VARCHAR(64) NOT NULL,
    `type` VARCHAR(64) NOT NULL,
    `severity` VARCHAR(191) NOT NULL DEFAULT 'low',
    `title` VARCHAR(191) NULL,
    `message` LONGTEXT NOT NULL,
    `data` JSON NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    UNIQUE INDEX `Notification_uuid_key`(`uuid`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `NotificationTarget` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `notificationId` INTEGER NOT NULL,
    `userId` INTEGER NOT NULL,
    `readAt` DATETIME(3) NULL,
    UNIQUE INDEX `NotificationTarget_notificationId_userId_key`(`notificationId`,`userId`),
    INDEX `NotificationTarget_userId_readAt_idx`(`userId`,`readAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `NotificationPreference` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `role` ENUM('ADMIN','ADMINLABO','ENSEIGNANT','LABORANTIN_PHYSIQUE','LABORANTIN_CHIMIE','ELEVE') NOT NULL,
    `module` VARCHAR(64) NOT NULL,
    `actionType` VARCHAR(64) NOT NULL,
    `enabled` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    UNIQUE INDEX `NotificationPreference_role_module_actionType_key`(`role`,`module`,`actionType`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `NotificationConfig` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `module` VARCHAR(64) NOT NULL,
    `actionType` VARCHAR(64) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `description` VARCHAR(255) NULL,
    `severity` VARCHAR(191) NOT NULL DEFAULT 'low',
    `enabled` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    UNIQUE INDEX `NotificationConfig_module_actionType_key`(`module`,`actionType`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Application settings key/value
CREATE TABLE `AppSetting` (
    `key` VARCHAR(64) NOT NULL,
    `value` VARCHAR(255) NULL,
    `jsonValue` JSON NULL,
    `updatedAt` DATETIME(3) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    PRIMARY KEY (`key`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Authentication logs
CREATE TABLE `AuthLog` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `email` VARCHAR(191) NULL,
    `userId` INTEGER NULL,
    `ip` VARCHAR(64) NULL,
    `success` BOOLEAN NOT NULL,
    `kind` VARCHAR(16) NOT NULL DEFAULT 'LOGIN',
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Password reset tokens
CREATE TABLE `PasswordResetToken` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `email` VARCHAR(191) NOT NULL,
    `token` VARCHAR(191) NOT NULL,
    `isOTP` BOOLEAN NOT NULL DEFAULT false,
    `expiresAt` DATETIME(3) NOT NULL,
    `usedAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    UNIQUE INDEX `PasswordResetToken_email_token_key`(`email`,`token`),
    INDEX `PasswordResetToken_email_idx`(`email`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Activation tokens for new accounts
CREATE TABLE `ActivationToken` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `email` VARCHAR(191) NOT NULL,
    `token` VARCHAR(191) NOT NULL,
    `expiresAt` DATETIME(3) NOT NULL,
    `usedAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `ActivationToken_token_key`(`token`),
    INDEX `ActivationToken_email_idx`(`email`),
    INDEX `ActivationToken_createdAt_idx`(`createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `EvenementMateriel` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `eventId` INTEGER NOT NULL,
    `materielId` INTEGER NULL,
    `materielName` VARCHAR(191) NOT NULL,
    `quantity` INTEGER NOT NULL DEFAULT 1,
    `isCustom` BOOLEAN NOT NULL DEFAULT false,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    INDEX `EvenementMateriel_eventId_idx`(`eventId`),
    INDEX `EvenementMateriel_materielId_idx`(`materielId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `EvenementReactif` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `eventId` INTEGER NOT NULL,
    `reactifId` INTEGER NULL,
    `reactifName` VARCHAR(191) NOT NULL,
    `requestedQuantity` DECIMAL(10,3) NOT NULL DEFAULT 0,
    `unit` VARCHAR(32) NULL DEFAULT 'g',
    `isCustom` BOOLEAN NOT NULL DEFAULT false,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    INDEX `EvenementReactif_eventId_idx`(`eventId`),
    INDEX `EvenementReactif_reactifId_idx`(`reactifId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `EvenementDocument` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `eventId` INTEGER NOT NULL,
    `fileName` VARCHAR(191) NOT NULL,
    `fileUrl` VARCHAR(500) NOT NULL,
    `fileSize` INTEGER NULL,
    `fileType` VARCHAR(100) NULL,
    `uploadedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    INDEX `EvenementDocument_eventId_idx`(`eventId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Foreign keys
ALTER TABLE `ClasseUtilisateur` ADD CONSTRAINT `ClasseUtilisateur_classId_fkey` FOREIGN KEY (`classId`) REFERENCES `Classe`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE `ClasseUtilisateur` ADD CONSTRAINT `ClasseUtilisateur_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `Utilisateur`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE `Evenement` ADD CONSTRAINT `Evenement_ownerId_fkey` FOREIGN KEY (`ownerId`) REFERENCES `Utilisateur`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE `Creneau` ADD CONSTRAINT `Creneau_eventId_fkey` FOREIGN KEY (`eventId`) REFERENCES `Evenement`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE `Salle` ADD CONSTRAINT `Salle_userOwnerId_fkey` FOREIGN KEY (`userOwnerId`) REFERENCES `Utilisateur`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE `Localisation` ADD CONSTRAINT `Localisation_salleId_fkey` FOREIGN KEY (`salleId`) REFERENCES `Salle`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `MaterielInventaire` ADD CONSTRAINT `MaterielInventaire_categoryId_fkey` FOREIGN KEY (`categoryId`) REFERENCES `MaterielCategorie`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE `MaterielInventaire` ADD CONSTRAINT `MaterielInventaire_localisationId_fkey` FOREIGN KEY (`localisationId`) REFERENCES `Localisation`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE `MaterielInventaire` ADD CONSTRAINT `MaterielInventaire_salleId_fkey` FOREIGN KEY (`salleId`) REFERENCES `Salle`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE `MaterielInventaire` ADD CONSTRAINT `MaterielInventaire_materielPersoId_fkey` FOREIGN KEY (`materielPersoId`) REFERENCES `MaterielPerso`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE `MaterielInventaire` ADD CONSTRAINT `MaterielInventaire_materielPresetId_fkey` FOREIGN KEY (`materielPresetId`) REFERENCES `MaterielPreset`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE `ReactifInventaire` ADD CONSTRAINT `ReactifInventaire_localisationId_fkey` FOREIGN KEY (`localisationId`) REFERENCES `Localisation`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE `ReactifInventaire` ADD CONSTRAINT `ReactifInventaire_reactifPresetId_fkey` FOREIGN KEY (`reactifPresetId`) REFERENCES `ReactifPreset`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE `ReactifInventaire` ADD CONSTRAINT `ReactifInventaire_salleId_fkey` FOREIGN KEY (`salleId`) REFERENCES `Salle`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE `ReactifInventaire` ADD CONSTRAINT `ReactifInventaire_supplierId_fkey` FOREIGN KEY (`supplierId`) REFERENCES `Supplier`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE `Consommable` ADD CONSTRAINT `Consommable_localisationId_fkey` FOREIGN KEY (`localisationId`) REFERENCES `Localisation`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE `Consommable` ADD CONSTRAINT `Consommable_salleId_fkey` FOREIGN KEY (`salleId`) REFERENCES `Salle`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE `NotificationTarget` ADD CONSTRAINT `NotificationTarget_notificationId_fkey` FOREIGN KEY (`notificationId`) REFERENCES `Notification`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `NotificationTarget` ADD CONSTRAINT `NotificationTarget_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `Utilisateur`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE `MaterielPreset` ADD CONSTRAINT `MaterielPreset_categoryId_fkey` FOREIGN KEY (`categoryId`) REFERENCES `MaterielCategorie`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE `MaterielPerso` ADD CONSTRAINT `MaterielPerso_categorieId_fkey` FOREIGN KEY (`categorieId`) REFERENCES `MaterielCategorie`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE `EvenementMateriel` ADD CONSTRAINT `EvenementMateriel_eventId_fkey` FOREIGN KEY (`eventId`) REFERENCES `Evenement`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `EvenementMateriel` ADD CONSTRAINT `EvenementMateriel_materielId_fkey` FOREIGN KEY (`materielId`) REFERENCES `MaterielInventaire`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE `EvenementReactif` ADD CONSTRAINT `EvenementReactif_eventId_fkey` FOREIGN KEY (`eventId`) REFERENCES `Evenement`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `EvenementReactif` ADD CONSTRAINT `EvenementReactif_reactifId_fkey` FOREIGN KEY (`reactifId`) REFERENCES `ReactifInventaire`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE `EvenementDocument` ADD CONSTRAINT `EvenementDocument_eventId_fkey` FOREIGN KEY (`eventId`) REFERENCES `Evenement`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- New tables for per-timeslot custom resource requests
CREATE TABLE `MaterielEventRequest` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `eventId` INTEGER NOT NULL,
    `userId` INTEGER NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `quantity` INTEGER NOT NULL DEFAULT 1,
    `discipline` VARCHAR(191) NULL,
    `isCustom` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    INDEX `MaterielEventRequest_eventId_idx`(`eventId`),
    INDEX `MaterielEventRequest_userId_idx`(`userId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `ReactifEventRequest` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `eventId` INTEGER NOT NULL,
    `userId` INTEGER NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `requestedQuantity` DECIMAL(10,3) NOT NULL DEFAULT 0,
    `unit` VARCHAR(32) NULL DEFAULT 'g',
    `discipline` VARCHAR(191) NULL,
    `isCustom` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    INDEX `ReactifEventRequest_eventId_idx`(`eventId`),
    INDEX `ReactifEventRequest_userId_idx`(`userId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Foreign keys for new event request tables
ALTER TABLE `MaterielEventRequest` ADD CONSTRAINT `MaterielEventRequest_eventId_fkey` FOREIGN KEY (`eventId`) REFERENCES `Evenement`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `MaterielEventRequest` ADD CONSTRAINT `MaterielEventRequest_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `Utilisateur`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `ReactifEventRequest` ADD CONSTRAINT `ReactifEventRequest_eventId_fkey` FOREIGN KEY (`eventId`) REFERENCES `Evenement`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `ReactifEventRequest` ADD CONSTRAINT `ReactifEventRequest_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `Utilisateur`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- Enforce uniqueness for documents per event (eventId + fileUrl)
ALTER TABLE `EvenementDocument` ADD UNIQUE INDEX `EvenementDocument_eventId_fileUrl_key`(`eventId`, `fileUrl`);

-- ===================== PRESET TABLES (TP Pré-configurés) =====================
CREATE TABLE `EvenementPreset` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `title` VARCHAR(191) NOT NULL,
    `discipline` VARCHAR(191) NOT NULL,
    `notes` VARCHAR(191) NULL,
    `ownerId` INTEGER NOT NULL,
    `sharedIds` JSON NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    INDEX `EvenementPreset_ownerId_idx`(`ownerId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `EvenementPresetMateriel` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `presetId` INTEGER NOT NULL,
    `materielId` INTEGER NULL,
    `materielName` VARCHAR(191) NOT NULL,
    `quantity` INTEGER NOT NULL DEFAULT 1,
    `isCustom` BOOLEAN NOT NULL DEFAULT false,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    INDEX `EvenementPresetMateriel_presetId_idx`(`presetId`),
    INDEX `EvenementPresetMateriel_materielId_idx`(`materielId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `EvenementPresetReactif` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `presetId` INTEGER NOT NULL,
    `reactifId` INTEGER NULL,
    `reactifName` VARCHAR(191) NOT NULL,
    `requestedQuantity` DECIMAL(10,3) NOT NULL DEFAULT 0,
    `unit` VARCHAR(32) NULL DEFAULT 'g',
    `isCustom` BOOLEAN NOT NULL DEFAULT false,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    INDEX `EvenementPresetReactif_presetId_idx`(`presetId`),
    INDEX `EvenementPresetReactif_reactifId_idx`(`reactifId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `EvenementPresetDocument` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `presetId` INTEGER NOT NULL,
    `fileName` VARCHAR(191) NOT NULL,
    `fileUrl` VARCHAR(500) NOT NULL,
    `fileSize` INTEGER NULL,
    `fileType` VARCHAR(100) NULL,
    `uploadedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    INDEX `EvenementPresetDocument_presetId_idx`(`presetId`),
    UNIQUE INDEX `EvenementPresetDocument_presetId_fileUrl_key`(`presetId`,`fileUrl`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Foreign keys for presets
ALTER TABLE `EvenementPreset` ADD CONSTRAINT `EvenementPreset_ownerId_fkey` FOREIGN KEY (`ownerId`) REFERENCES `Utilisateur`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE `EvenementPresetMateriel` ADD CONSTRAINT `EvenementPresetMateriel_presetId_fkey` FOREIGN KEY (`presetId`) REFERENCES `EvenementPreset`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `EvenementPresetMateriel` ADD CONSTRAINT `EvenementPresetMateriel_materielId_fkey` FOREIGN KEY (`materielId`) REFERENCES `MaterielInventaire`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE `EvenementPresetReactif` ADD CONSTRAINT `EvenementPresetReactif_presetId_fkey` FOREIGN KEY (`presetId`) REFERENCES `EvenementPreset`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `EvenementPresetReactif` ADD CONSTRAINT `EvenementPresetReactif_reactifId_fkey` FOREIGN KEY (`reactifId`) REFERENCES `ReactifInventaire`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE `EvenementPresetDocument` ADD CONSTRAINT `EvenementPresetDocument_presetId_fkey` FOREIGN KEY (`presetId`) REFERENCES `EvenementPreset`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- Schedule slots for presets (similar to Creneau but without proposed* fields)
CREATE TABLE `EvenementPresetCreneau` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `presetId` INTEGER NOT NULL,
    `discipline` VARCHAR(191) NOT NULL,
    `userId` INTEGER NULL,
    `eventOwner` INTEGER NULL,
    `timeslotParent` INTEGER NULL,
    `state` VARCHAR(191) NOT NULL DEFAULT 'created',
    `startDate` DATETIME(3) NOT NULL,
    `endDate` DATETIME(3) NOT NULL,
    `timeslotDate` DATETIME(3) NULL,
    `proposedNotes` VARCHAR(191) NULL,
    `salleIds` JSON NULL,
    `classIds` JSON NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    INDEX `EvenementPresetCreneau_presetId_idx`(`presetId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `EvenementPresetCreneau` ADD CONSTRAINT `EvenementPresetCreneau_presetId_fkey` FOREIGN KEY (`presetId`) REFERENCES `EvenementPreset`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- Added consolidated indexes for authentication & reset token performance (originally 20250819_add_authlog_indexes)
CREATE INDEX `AuthLog_email_createdAt_kind_idx` ON `AuthLog`(`email`, `createdAt`, `kind`);
CREATE INDEX `AuthLog_createdAt_idx` ON `AuthLog`(`createdAt`);
CREATE INDEX `PasswordResetToken_createdAt_idx` ON `PasswordResetToken`(`createdAt`);

-- Table for pending email change verifications
CREATE TABLE `EmailChangeRequest` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `userId` INTEGER NOT NULL,
    `oldEmail` VARCHAR(191) NOT NULL,
    `newEmail` VARCHAR(191) NOT NULL,
    `token` VARCHAR(191) NOT NULL,
    `expiresAt` DATETIME(3) NOT NULL,
    `usedAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    UNIQUE INDEX `EmailChangeRequest_token_key`(`token`),
    INDEX `EmailChangeRequest_userId_idx`(`userId`),
    INDEX `EmailChangeRequest_newEmail_idx`(`newEmail`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `EmailChangeRequest` ADD CONSTRAINT `EmailChangeRequest_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `Utilisateur`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- API logging table for audit
CREATE TABLE `ApiLog` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `timestamp` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `method` VARCHAR(16) NOT NULL,
    `path` VARCHAR(500) NOT NULL,
    `userId` INTEGER NULL,
    `role` VARCHAR(32) NULL,
    `status` INTEGER NULL,
    `ip` VARCHAR(64) NULL,
    `userAgent` VARCHAR(500) NULL,
    `module` VARCHAR(64) NULL,
    `action` VARCHAR(64) NULL,
    `message` TEXT NULL,
    `meta` JSON NULL,
    
    INDEX `ApiLog_timestamp_idx`(`timestamp`),
    INDEX `ApiLog_path_idx`(`path`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
