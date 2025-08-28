-- Script de migration pour remplir categoryId dans MaterielPreset
-- Associe chaque MaterielPreset à la bonne MaterielCategorie via le nom et la discipline

UPDATE MaterielPreset mp
LEFT JOIN MaterielCategorie mc
  ON mp.category = mc.name AND mp.discipline = mc.discipline
SET mp.categoryId = mc.id
WHERE mp.categoryId IS NULL AND mp.category IS NOT NULL;

-- Optionnel : vérifier les lignes non migrées
SELECT * FROM MaterielPreset WHERE categoryId IS NULL AND category IS NOT NULL;
