-- Remove emino (and any dependent rows) safely
DELETE FROM auth.password_reset_tokens WHERE user_id IN (
  SELECT id FROM auth.users WHERE lower(username) = 'emino'
);
DELETE FROM auth.user_roles WHERE user_id IN (
  SELECT id FROM auth.users WHERE lower(username) = 'emino'
);
DELETE FROM auth.users WHERE lower(username) = 'emino';
