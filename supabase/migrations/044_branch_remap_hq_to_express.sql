-- Migration 044: Remap branches to standardised 10-branch ecosystem
-- HQ (zero-value rows) is removed; remaining 10 branches get final codes.

-- 1. Delete HQ data from all fact tables (all HQ rows are zero-value)
DELETE FROM analytics_fact_sales
WHERE branch_id = (SELECT id FROM analytics_branches WHERE code = 'HQ');

DELETE FROM analytics_fact_inventory
WHERE branch_id = (SELECT id FROM analytics_branches WHERE code = 'HQ');

DELETE FROM analytics_fact_pricing
WHERE branch_id = (SELECT id FROM analytics_branches WHERE code = 'HQ');

-- 2. Delete HQ references from sharing and staging
DELETE FROM portal_analytics_sharing
WHERE branch_id = (SELECT id FROM analytics_branches WHERE code = 'HQ');

DELETE FROM analytics_staging_uploads
WHERE branch_id = (SELECT id FROM analytics_branches WHERE code = 'HQ');

-- 3. Delete HQ branch
DELETE FROM analytics_branches WHERE code = 'HQ';

-- 4. Update remaining branches with final names and codes
UPDATE analytics_branches SET name = 'Narok NRK',   code = 'NRK'  WHERE code = 'NAROK';
UPDATE analytics_branches SET name = 'Nyahururu NYH', code = 'NYH' WHERE code = 'NYAHURURU';
UPDATE analytics_branches SET name = 'Nakuru NKR',   code = 'NKR'  WHERE code = 'NAKURU';
UPDATE analytics_branches SET name = 'Naivasha NVS', code = 'NVS'  WHERE code = 'NAIVASHA';
UPDATE analytics_branches SET name = 'Karatina KRT', code = 'KRT'  WHERE code = 'KARATINA';
UPDATE analytics_branches SET name = 'Meru MEU',     code = 'MEU'  WHERE code = 'MERU';
UPDATE analytics_branches SET name = 'Maua MUA',     code = 'MUA'  WHERE code = 'MAUA';
UPDATE analytics_branches SET name = 'Engineer ENG', code = 'ENG'  WHERE code = 'ENGINEER';
UPDATE analytics_branches SET name = 'THika Nampark NMPK',  code = 'NMPK' WHERE code = 'THIKA STORE(NAMPAK)';
UPDATE analytics_branches SET name = 'THika Express CBD',   code = 'ECBD' WHERE code = 'THIKA CBD';
