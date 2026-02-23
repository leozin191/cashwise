-- Run these migrations when upgrading the database schema.
-- Required after the changes introduced in this session.

-- 1. Add category column to incomes table (income category feature)
ALTER TABLE incomes ADD COLUMN IF NOT EXISTS category VARCHAR(50);

-- 2. Create password_reset_tokens table (forgot password feature)
CREATE TABLE IF NOT EXISTS password_reset_tokens (
    id         BIGSERIAL PRIMARY KEY,
    token      VARCHAR(255) NOT NULL UNIQUE,
    email      VARCHAR(255) NOT NULL,
    expires_at TIMESTAMP   NOT NULL,
    used       BOOLEAN     NOT NULL DEFAULT FALSE
);

CREATE INDEX IF NOT EXISTS idx_prt_email ON password_reset_tokens (email);

-- 3. Family / Joint Accounts feature

-- Username on users
ALTER TABLE users ADD COLUMN IF NOT EXISTS username VARCHAR(30) UNIQUE;

-- Households
CREATE TABLE IF NOT EXISTS households (
    id         BIGSERIAL PRIMARY KEY,
    name       VARCHAR(100) NOT NULL,
    created_by BIGINT NOT NULL REFERENCES users(id),
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Members (UNIQUE user_id enforces max-1-household rule)
CREATE TABLE IF NOT EXISTS household_members (
    id           BIGSERIAL PRIMARY KEY,
    household_id BIGINT NOT NULL REFERENCES households(id) ON DELETE CASCADE,
    user_id      BIGINT NOT NULL REFERENCES users(id)      ON DELETE CASCADE,
    role         VARCHAR(20) NOT NULL DEFAULT 'MEMBER',  -- OWNER | MEMBER
    joined_at    TIMESTAMP NOT NULL DEFAULT NOW(),
    UNIQUE(user_id)
);

-- Invitations
CREATE TABLE IF NOT EXISTS household_invitations (
    id           BIGSERIAL PRIMARY KEY,
    household_id BIGINT NOT NULL REFERENCES households(id) ON DELETE CASCADE,
    invited_by   BIGINT NOT NULL REFERENCES users(id),
    email        VARCHAR(255) NOT NULL,
    token        VARCHAR(255) UNIQUE NOT NULL,
    status       VARCHAR(20) NOT NULL DEFAULT 'PENDING',  -- PENDING | ACCEPTED | DECLINED
    expires_at   TIMESTAMP NOT NULL,
    created_at   TIMESTAMP NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_hi_token ON household_invitations(token);
CREATE INDEX IF NOT EXISTS idx_hi_email  ON household_invitations(email);

-- Add household_id to existing tables (userId = addedBy, householdId = new scoping key)
ALTER TABLE expenses      ADD COLUMN IF NOT EXISTS household_id BIGINT REFERENCES households(id) ON DELETE SET NULL;
ALTER TABLE incomes       ADD COLUMN IF NOT EXISTS household_id BIGINT REFERENCES households(id) ON DELETE SET NULL;
ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS household_id BIGINT REFERENCES households(id) ON DELETE SET NULL;

-- Migrate existing users → personal households
INSERT INTO households (name, created_by, created_at)
SELECT name || '''s Household', id, NOW() FROM users
ON CONFLICT DO NOTHING;

INSERT INTO household_members (household_id, user_id, role, joined_at)
SELECT h.id, h.created_by, 'OWNER', NOW() FROM households h
ON CONFLICT (user_id) DO NOTHING;

UPDATE expenses e
SET household_id = hm.household_id
FROM household_members hm WHERE hm.user_id = e.user_id AND e.household_id IS NULL;

UPDATE incomes i
SET household_id = hm.household_id
FROM household_members hm WHERE hm.user_id = i.user_id AND i.household_id IS NULL;

UPDATE subscriptions s
SET household_id = hm.household_id
FROM household_members hm WHERE hm.user_id = s.user_id AND s.household_id IS NULL;

-- Shared budgets (household-scoped, one per category per household)
CREATE TABLE IF NOT EXISTS budgets (
    id           BIGSERIAL PRIMARY KEY,
    household_id BIGINT NOT NULL REFERENCES households(id) ON DELETE CASCADE,
    user_id      BIGINT NOT NULL REFERENCES users(id),
    category     VARCHAR(50) NOT NULL,
    monthly_limit DECIMAL(12,2) NOT NULL,
    currency     VARCHAR(10) NOT NULL DEFAULT 'EUR',
    created_at   TIMESTAMP NOT NULL DEFAULT NOW(),
    UNIQUE(household_id, category)
);
CREATE INDEX IF NOT EXISTS idx_budgets_household ON budgets(household_id);
