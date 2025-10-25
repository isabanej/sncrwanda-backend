-- Migration: Split fullName into firstName and lastName
-- Date: 2025-10-19
-- Services: hr-service, student-service

-- HR Service: Update employees table
ALTER TABLE employees ADD COLUMN first_name VARCHAR(255);
ALTER TABLE employees ADD COLUMN last_name VARCHAR(255);

-- Migrate existing data (split fullName by last space)
UPDATE employees 
SET 
  first_name = CASE 
    WHEN position(' ' in full_name) > 0 
    THEN substring(full_name from 1 for position(' ' in reverse(full_name))-1)
    ELSE full_name 
  END,
  last_name = CASE 
    WHEN position(' ' in full_name) > 0 
    THEN substring(full_name from length(full_name) - position(' ' in reverse(full_name)) + 2)
    ELSE '' 
  END;

-- Make columns non-nullable after migration
ALTER TABLE employees ALTER COLUMN first_name SET NOT NULL;
ALTER TABLE employees ALTER COLUMN last_name SET NOT NULL;

-- Drop old column
ALTER TABLE employees DROP COLUMN full_name;

-- Student Service: Update guardians table
ALTER TABLE guardians ADD COLUMN first_name VARCHAR(255);
ALTER TABLE guardians ADD COLUMN last_name VARCHAR(255);

-- Migrate existing data
UPDATE guardians 
SET 
  first_name = CASE 
    WHEN position(' ' in full_name) > 0 
    THEN substring(full_name from 1 for position(' ' in reverse(full_name))-1)
    ELSE full_name 
  END,
  last_name = CASE 
    WHEN position(' ' in full_name) > 0 
    THEN substring(full_name from length(full_name) - position(' ' in reverse(full_name)) + 2)
    ELSE '' 
  END;

-- Make columns non-nullable after migration
ALTER TABLE guardians ALTER COLUMN first_name SET NOT NULL;
ALTER TABLE guardians ALTER COLUMN last_name SET NOT NULL;

-- Drop old column
ALTER TABLE guardians DROP COLUMN full_name;
