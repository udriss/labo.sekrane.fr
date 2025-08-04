-- Migration du champ class_name vers class_data avec objet JSON
-- Ce script migre les données existantes et modifie la structure des tables

-- 1. Ajouter le nouveau champ class_data aux tables calendar_chimie et calendar_physique
ALTER TABLE calendar_chimie ADD COLUMN class_data TEXT AFTER class_name;
ALTER TABLE calendar_physique ADD COLUMN class_data TEXT AFTER class_name;

-- 2. Migrer les données existantes de class_name vers class_data
-- Pour calendar_chimie
UPDATE calendar_chimie 
SET class_data = CASE 
  WHEN class_name IS NOT NULL AND class_name != '' THEN 
    JSON_OBJECT(
      'id', CONCAT('auto-', MD5(CONCAT(class_name, 'chimie'))),
      'name', class_name,
      'type', 'auto'
    )
  ELSE NULL
END
WHERE class_name IS NOT NULL AND class_name != '';

-- Pour calendar_physique
UPDATE calendar_physique 
SET class_data = CASE 
  WHEN class_name IS NOT NULL AND class_name != '' THEN 
    JSON_OBJECT(
      'id', CONCAT('auto-', MD5(CONCAT(class_name, 'physique'))),
      'name', class_name,
      'type', 'auto'
    )
  ELSE NULL
END
WHERE class_name IS NOT NULL AND class_name != '';

-- 3. Créer des index pour le nouveau champ JSON
CREATE INDEX idx_class_data_name ON calendar_chimie ((JSON_UNQUOTE(JSON_EXTRACT(class_data, '$.name'))));
CREATE INDEX idx_class_data_type ON calendar_chimie ((JSON_UNQUOTE(JSON_EXTRACT(class_data, '$.type'))));
CREATE INDEX idx_class_data_name ON calendar_physique ((JSON_UNQUOTE(JSON_EXTRACT(class_data, '$.name'))));
CREATE INDEX idx_class_data_type ON calendar_physique ((JSON_UNQUOTE(JSON_EXTRACT(class_data, '$.type'))));

-- Note: Une fois que tous les clients utilisent class_data, vous pourrez supprimer class_name
-- ALTER TABLE calendar_chimie DROP COLUMN class_name;
-- ALTER TABLE calendar_physique DROP COLUMN class_name;
-- DROP INDEX idx_class_name ON calendar_chimie;
-- DROP INDEX idx_class_name ON calendar_physique;
