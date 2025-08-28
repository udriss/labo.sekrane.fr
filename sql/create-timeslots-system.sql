-- Timeslots system tables and views
CREATE TABLE IF NOT EXISTS timeslots_data (
  id INT AUTO_INCREMENT PRIMARY KEY,
  event_id INT NOT NULL,
  discipline VARCHAR(32) NOT NULL,
  user_id INT NULL,
  event_owner INT NULL,
  timeslot_parent INT NULL,
  state ENUM('created','modified','deleted','invalidated','approved','rejected','restored') NOT NULL DEFAULT 'created',
  start_date DATETIME NOT NULL,
  end_date DATETIME NOT NULL,
  timeslot_date DATE NULL,
  notes TEXT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS timeslot_history (
  id INT AUTO_INCREMENT PRIMARY KEY,
  timeslot_id INT NOT NULL,
  previous_state VARCHAR(32) NOT NULL,
  new_state VARCHAR(32) NOT NULL,
  changed_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  notes TEXT NULL
);

CREATE OR REPLACE VIEW active_timeslots AS
SELECT * FROM timeslots_data WHERE state IN ('created','modified','approved','restored');

CREATE OR REPLACE VIEW pending_timeslots AS
SELECT * FROM timeslots_data WHERE state IN ('created','modified');
