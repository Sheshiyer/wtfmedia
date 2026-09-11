-- A browser-safe principal profile mirror. Authority remains on operators/member_users.
-- Every profile belongs to exactly one roster owner; no Clerk subject is stored here.
CREATE TABLE principal_profiles (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  email TEXT NOT NULL UNIQUE CHECK (email = lower(trim(email)) AND length(email) BETWEEN 3 AND 320),
  member_id INTEGER UNIQUE REFERENCES member_users(id) ON DELETE RESTRICT,
  operator_id INTEGER UNIQUE REFERENCES operators(id) ON DELETE RESTRICT,
  first_name TEXT CHECK (first_name IS NULL OR length(first_name) BETWEEN 1 AND 80),
  last_name TEXT CHECK (last_name IS NULL OR length(last_name) BETWEEN 1 AND 80),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  CHECK ((member_id IS NOT NULL AND operator_id IS NULL) OR (member_id IS NULL AND operator_id IS NOT NULL))
);

CREATE INDEX principal_profiles_member ON principal_profiles(member_id);
CREATE INDEX principal_profiles_operator ON principal_profiles(operator_id);

-- Operators take precedence for historical email collisions; no display names are
-- inferred from email. Member rows collide only if an operator did not claim it.
INSERT INTO principal_profiles (email, operator_id, created_at, updated_at)
SELECT email, id, created_at, updated_at FROM operators;

INSERT INTO principal_profiles (email, member_id, created_at, updated_at)
SELECT m.email, m.id, m.created_at, m.updated_at
FROM member_users m
WHERE NOT EXISTS (SELECT 1 FROM operators o WHERE o.email = m.email);

CREATE TRIGGER principal_profiles_no_owner_reassignment
BEFORE UPDATE OF member_id, operator_id ON principal_profiles
BEGIN
  SELECT RAISE(ABORT, 'principal profile owner is immutable');
END;

CREATE TRIGGER principal_profiles_names_bounded
BEFORE UPDATE OF first_name, last_name ON principal_profiles
WHEN (NEW.first_name IS NOT NULL AND length(NEW.first_name) NOT BETWEEN 1 AND 80)
  OR (NEW.last_name IS NOT NULL AND length(NEW.last_name) NOT BETWEEN 1 AND 80)
BEGIN
  SELECT RAISE(ABORT, 'principal profile names must remain bounded');
END;
