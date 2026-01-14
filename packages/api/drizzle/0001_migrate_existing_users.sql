-- Migration: Migrate Existing Users to Organizations and Teams
-- This script should be run AFTER the schema migration (0000_loose_mandrill.sql)
-- It creates a default organization and team for existing users

-- Step 1: Create the default organization for existing users
INSERT INTO organizations (id, name, slug, description, created_at, updated_at, is_active)
SELECT
  gen_random_uuid(),
  'Default Organization',
  'default',
  'Auto-created organization for existing users',
  NOW(),
  NOW(),
  true
WHERE NOT EXISTS (
  SELECT 1 FROM organizations WHERE slug = 'default'
);

-- Step 2: Update all users without an organization to belong to the default organization
UPDATE users
SET organization_id = (SELECT id FROM organizations WHERE slug = 'default')
WHERE organization_id IS NULL;

-- Step 3: Create a default "General" team in the default organization
INSERT INTO teams (id, organization_id, name, slug, description, created_at, updated_at, is_active)
SELECT
  gen_random_uuid(),
  (SELECT id FROM organizations WHERE slug = 'default'),
  'General',
  'general',
  'Default team for all organization members',
  NOW(),
  NOW(),
  true
WHERE NOT EXISTS (
  SELECT 1 FROM teams t
  JOIN organizations o ON t.organization_id = o.id
  WHERE o.slug = 'default' AND t.slug = 'general'
);

-- Step 4: Add all users in the default organization to the General team as team_member
-- Skip users who are already members of the team
INSERT INTO team_memberships (id, team_id, user_id, role, joined_at)
SELECT
  gen_random_uuid(),
  t.id,
  u.id,
  'team_member',
  NOW()
FROM users u
JOIN organizations o ON u.organization_id = o.id
JOIN teams t ON t.organization_id = o.id AND t.slug = 'general'
WHERE o.slug = 'default'
  AND NOT EXISTS (
    SELECT 1 FROM team_memberships tm
    WHERE tm.team_id = t.id AND tm.user_id = u.id
  );

-- Step 5: Promote the first user (oldest by created_at) to org_admin
-- This ensures there's at least one admin in the default organization
UPDATE team_memberships
SET role = 'org_admin'
WHERE id = (
  SELECT tm.id
  FROM team_memberships tm
  JOIN users u ON tm.user_id = u.id
  JOIN organizations o ON u.organization_id = o.id
  WHERE o.slug = 'default'
  ORDER BY u.created_at ASC
  LIMIT 1
);
