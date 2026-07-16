-- Fix 7: Add RLS policies for automations and templates tables
-- These tables had RLS enabled with zero policies, making them silently non-functional.

-- Automations: only super_admin and crm_admin can manage
CREATE POLICY "staff_read_automations" ON automations
  FOR SELECT USING (
    auth.jwt() ->> 'role' IN ('super_admin', 'crm_admin')
  );

CREATE POLICY "admin_manage_automations" ON automations
  FOR ALL USING (
    auth.jwt() ->> 'role' IN ('super_admin', 'crm_admin')
  );

-- Templates: only super_admin and cms_admin can manage
CREATE POLICY "staff_read_templates" ON templates
  FOR SELECT USING (
    auth.jwt() ->> 'role' IN ('super_admin', 'cms_admin')
  );

CREATE POLICY "admin_manage_templates" ON templates
  FOR ALL USING (
    auth.jwt() ->> 'role' IN ('super_admin', 'cms_admin')
  );
