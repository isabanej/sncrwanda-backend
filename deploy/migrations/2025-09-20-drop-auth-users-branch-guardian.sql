-- Migration: Drop obsolete columns from auth.users
-- Date: 2025-09-20
-- Purpose: Remove branch_id and guardian_id columns that were deprecated and removed from the codebase.
-- This script is idempotent due to IF EXISTS.

BEGIN;

ALTER TABLE auth.users DROP COLUMN IF EXISTS branch_id;
ALTER TABLE auth.users DROP COLUMN IF EXISTS guardian_id;

COMMIT;
