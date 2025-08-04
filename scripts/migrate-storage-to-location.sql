-- Migration script to convert storage to location and room as JSON objects
-- This script should be run manually on the database

-- Step 1: Add the new JSON columns
ALTER TABLE chemicals 
ADD COLUMN IF NOT EXISTS location_json JSON DEFAULT NULL AFTER openedDate,
ADD COLUMN IF NOT EXISTS room_json JSON DEFAULT NULL AFTER location_json;

-- Step 2: Migrate existing string data to JSON objects
-- Convert existing 'storage' string to location JSON object
UPDATE chemicals 
SET location_json = JSON_OBJECT(
  'id', CONCAT('loc_', id),
  'name', storage,
  'room_id', CONCAT('room_', id),
  'is_active', true,
  'description', NULL
)
WHERE storage IS NOT NULL AND storage != '';

-- Convert existing 'room' string to room JSON object  
UPDATE chemicals 
SET room_json = JSON_OBJECT(
  'id', CONCAT('room_', id),
  'name', room,
  'description', NULL,
  'capacity', NULL
)
WHERE room IS NOT NULL AND room != '';

-- Step 3: Drop old columns and rename new ones
ALTER TABLE chemicals 
DROP COLUMN IF EXISTS storage,
DROP COLUMN IF EXISTS room;

ALTER TABLE chemicals 
CHANGE COLUMN location_json location JSON DEFAULT NULL,
CHANGE COLUMN room_json room JSON DEFAULT NULL;

-- Step 4: Update indexes
DROP INDEX IF EXISTS idx_storage ON chemicals;
DROP INDEX IF EXISTS idx_room ON chemicals;

-- Step 5: Verify the changes
SELECT COUNT(*) as total_chemicals, 
       COUNT(location) as chemicals_with_location,
       COUNT(room) as chemicals_with_room
FROM chemicals;
