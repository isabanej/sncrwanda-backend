-- Promote specified username to SUPER_ADMIN (idempotent)
\set username 'emino'
INSERT INTO auth.user_roles (user_id, role)
SELECT u.id, 'SUPER_ADMIN'
FROM auth.users u
WHERE lower(u.username) = :'username'
  AND NOT EXISTS (
    SELECT 1 FROM auth.user_roles r WHERE r.user_id = u.id AND r.role = 'SUPER_ADMIN'
  );
