-- 052_rls_hardening.sql
-- RLS hardening: auth_client_ids() helper, scoped client policies, analytics scoping,
-- broken auth.jwt() role checks, composite indexes for portal + analytics filters.
BEGIN;

CREATE OR REPLACE FUNCTION public.auth_client_ids() RETURNS SETOF uuid
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, auth AS $$
  SELECT c.id FROM public.clients c WHERE c.user_id = auth.uid()
  UNION
  SELECT cu.client_id FROM public.client_users cu WHERE cu.user_id = auth.uid()
  UNION
  SELECT p.client_id FROM public.projects p
  WHERE p.assigned_to = auth.uid() AND p.client_id IS NOT NULL
$$;

CREATE OR REPLACE FUNCTION public.portal_can_see_sharing(
  p_period_id uuid, p_branch_id uuid, p_category_id uuid
) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, auth AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.portal_analytics_sharing sh
    WHERE sh.client_id IN (SELECT public.auth_client_ids())
      AND sh.visible = true
      AND sh.period_id = p_period_id
      AND (sh.branch_id IS NULL OR sh.branch_id = p_branch_id)
      AND (sh.category_id IS NULL OR sh.category_id = p_category_id)
  );
$$;

DROP POLICY IF EXISTS "client can read own record" ON public.clients;
DROP POLICY IF EXISTS "client can update own record" ON public.clients;
CREATE POLICY "client can read own record scoped" ON public.clients
  FOR SELECT TO authenticated USING (id IN (SELECT public.auth_client_ids()));
CREATE POLICY "client can update own record scoped" ON public.clients
  FOR UPDATE TO authenticated
  USING (id IN (SELECT public.auth_client_ids()))
  WITH CHECK (id IN (SELECT public.auth_client_ids()));

DROP POLICY IF EXISTS "client can read own projects" ON public.projects;
CREATE POLICY "client can read own projects scoped" ON public.projects
  FOR SELECT TO authenticated USING (client_id IN (SELECT public.auth_client_ids()));

DROP POLICY IF EXISTS "client can read own invoices" ON public.invoices;
CREATE POLICY "client can read own invoices scoped" ON public.invoices
  FOR SELECT TO authenticated USING (client_id IN (SELECT public.auth_client_ids()));

DROP POLICY IF EXISTS "authenticated can read bookings" ON public.bookings;
DROP POLICY IF EXISTS "authenticated can insert bookings" ON public.bookings;
DROP POLICY IF EXISTS "authenticated can update bookings" ON public.bookings;
DROP POLICY IF EXISTS "staff can read bookings" ON public.bookings;
DROP POLICY IF EXISTS "admin or finance can insert bookings" ON public.bookings;
DROP POLICY IF EXISTS "admin or finance can update bookings" ON public.bookings;
DROP POLICY IF EXISTS "client can read own bookings" ON public.bookings;
CREATE POLICY "bookings scoped read" ON public.bookings FOR SELECT TO authenticated
  USING (public.is_admin() OR public.user_role() = ANY(ARRAY['finance','crm_staff'])
         OR client_id IN (SELECT public.auth_client_ids()));
CREATE POLICY "bookings scoped insert" ON public.bookings FOR INSERT TO authenticated
  WITH CHECK (public.is_admin() OR public.user_role() = 'finance');
CREATE POLICY "bookings scoped update" ON public.bookings FOR UPDATE TO authenticated
  USING (public.is_admin() OR public.user_role() = 'finance')
  WITH CHECK (public.is_admin() OR public.user_role() = 'finance');

DROP POLICY IF EXISTS "client can read own conversations" ON public.conversations;
CREATE POLICY "client can read own conversations scoped" ON public.conversations
  FOR SELECT TO authenticated USING (client_id IN (SELECT public.auth_client_ids()));

DROP POLICY IF EXISTS "authenticated can read messages" ON public.messages;
DROP POLICY IF EXISTS "authenticated can insert messages" ON public.messages;
DROP POLICY IF EXISTS "staff can read messages for accessible conversations" ON public.messages;
DROP POLICY IF EXISTS "staff can insert messages for accessible conversations" ON public.messages;
DROP POLICY IF EXISTS "client can read own messages" ON public.messages;
DROP POLICY IF EXISTS "client can send own messages" ON public.messages;
CREATE POLICY "messages scoped read" ON public.messages FOR SELECT TO authenticated
  USING (public.is_admin() OR conversation_id IN (
    SELECT c.id FROM public.conversations c
    WHERE c.assigned_to = auth.uid() OR c.client_id IN (SELECT public.auth_client_ids())));
CREATE POLICY "messages scoped insert" ON public.messages FOR INSERT TO authenticated
  WITH CHECK (public.is_admin() OR conversation_id IN (
    SELECT c.id FROM public.conversations c
    WHERE c.assigned_to = auth.uid() OR c.client_id IN (SELECT public.auth_client_ids())));

DROP POLICY IF EXISTS "authenticated can read activity_log" ON public.activity_log;
DROP POLICY IF EXISTS "authenticated can insert activity_log" ON public.activity_log;
DROP POLICY IF EXISTS "admin can read all activity_log" ON public.activity_log;
DROP POLICY IF EXISTS "admin can insert activity_log" ON public.activity_log;
CREATE POLICY "activity_log scoped read" ON public.activity_log FOR SELECT TO authenticated
  USING (public.is_admin() OR user_id = auth.uid() OR client_id IN (SELECT public.auth_client_ids()));
CREATE POLICY "activity_log scoped insert" ON public.activity_log FOR INSERT TO authenticated
  WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "authenticated can read inventory" ON public.inventory;
CREATE POLICY "inventory scoped read" ON public.inventory FOR SELECT TO authenticated
  USING (public.is_admin() OR public.user_role() = ANY(ARRAY['finance','crm_staff'])
         OR status = 'available'
         OR booked_by IN (SELECT public.auth_client_ids()));

DROP POLICY IF EXISTS "clients can read visible reports" ON public.reports;
DROP POLICY IF EXISTS "client can read own visible reports" ON public.reports;
CREATE POLICY "clients can read visible reports scoped" ON public.reports
  FOR SELECT TO authenticated
  USING (visible_to_client = true AND (
      client_id IN (SELECT public.auth_client_ids())
      OR project_id IN (SELECT p.id FROM public.projects p
                        WHERE p.client_id IN (SELECT public.auth_client_ids()))));

DROP POLICY IF EXISTS "clients can read visible report metrics" ON public.report_metrics;
CREATE POLICY "clients can read visible report metrics scoped" ON public.report_metrics
  FOR SELECT TO authenticated
  USING (report_id IN (
    SELECT r.id FROM public.reports r
    WHERE r.visible_to_client = true
      AND (r.client_id IN (SELECT public.auth_client_ids())
           OR r.project_id IN (SELECT p.id FROM public.projects p
                               WHERE p.client_id IN (SELECT public.auth_client_ids())))));

DROP POLICY IF EXISTS "clients can read visible documents" ON public.documents;
DROP POLICY IF EXISTS "client can read own visible documents" ON public.documents;
CREATE POLICY "clients can read visible documents scoped" ON public.documents
  FOR SELECT TO authenticated
  USING (visible_to_client = true AND client_id IN (SELECT public.auth_client_ids()));

DROP POLICY IF EXISTS "client can read own deliverables" ON public.deliverables;
CREATE POLICY "client can read own deliverables scoped" ON public.deliverables
  FOR SELECT TO authenticated
  USING (visible_to_client = true AND client_id IN (SELECT public.auth_client_ids()));

DROP POLICY IF EXISTS "client can read their notifications" ON public.notifications;
DROP POLICY IF EXISTS "client can update their notifications" ON public.notifications;
DROP POLICY IF EXISTS "client read own notifications" ON public.notifications;
DROP POLICY IF EXISTS "client update own notifications" ON public.notifications;
CREATE POLICY "client read own notifications scoped" ON public.notifications
  FOR SELECT TO authenticated USING (client_id IN (SELECT public.auth_client_ids()));
CREATE POLICY "client update own notifications scoped" ON public.notifications
  FOR UPDATE TO authenticated
  USING (client_id IN (SELECT public.auth_client_ids()))
  WITH CHECK (client_id IN (SELECT public.auth_client_ids()));

DROP POLICY IF EXISTS "client can read their milestones" ON public.project_milestones;
CREATE POLICY "client can read their milestones scoped" ON public.project_milestones
  FOR SELECT TO authenticated USING (client_id IN (SELECT public.auth_client_ids()));

DROP POLICY IF EXISTS "client can read their activity" ON public.client_activity_log;
CREATE POLICY "client can read their activity scoped" ON public.client_activity_log
  FOR SELECT TO authenticated USING (client_id IN (SELECT public.auth_client_ids()));

DROP POLICY IF EXISTS "client can read their payments" ON public.invoice_payments;
DROP POLICY IF EXISTS "client can insert their payments" ON public.invoice_payments;
CREATE POLICY "client can read their payments scoped" ON public.invoice_payments
  FOR SELECT TO authenticated USING (client_id IN (SELECT public.auth_client_ids()));
CREATE POLICY "client can insert their payments scoped" ON public.invoice_payments
  FOR INSERT TO authenticated WITH CHECK (client_id IN (SELECT public.auth_client_ids()));

DROP POLICY IF EXISTS "client can read their payment confirmations" ON public.payment_confirmations;
CREATE POLICY "client can read their payment confirmations scoped" ON public.payment_confirmations
  FOR SELECT TO authenticated USING (client_id IN (SELECT public.auth_client_ids()));

DROP POLICY IF EXISTS "anyone can read published content" ON public.cms_content;
CREATE POLICY "anyone can read published content scoped" ON public.cms_content
  FOR SELECT TO authenticated USING (published = true OR client_id IN (SELECT public.auth_client_ids()));

DROP POLICY IF EXISTS "client can read their project updates" ON public.portal_project_updates;
CREATE POLICY "client can read their project updates scoped" ON public.portal_project_updates
  FOR SELECT TO authenticated
  USING (visible_to_client = true AND client_id IN (SELECT public.auth_client_ids()));

DROP POLICY IF EXISTS "client can read project_notes" ON public.project_notes;
CREATE POLICY "client can read project_notes scoped" ON public.project_notes
  FOR SELECT TO authenticated USING (project_id IN (
    SELECT p.id FROM public.projects p WHERE p.client_id IN (SELECT public.auth_client_ids())));
DROP POLICY IF EXISTS "client can read project_members" ON public.project_members;
CREATE POLICY "client can read project_members scoped" ON public.project_members
  FOR SELECT TO authenticated USING (project_id IN (
    SELECT p.id FROM public.projects p WHERE p.client_id IN (SELECT public.auth_client_ids())));
DROP POLICY IF EXISTS "client can read project_messages" ON public.project_messages;
DROP POLICY IF EXISTS "client can send project_messages" ON public.project_messages;
CREATE POLICY "client can read project_messages scoped" ON public.project_messages
  FOR SELECT TO authenticated USING (project_id IN (
    SELECT p.id FROM public.projects p WHERE p.client_id IN (SELECT public.auth_client_ids())));
CREATE POLICY "client can send project_messages scoped" ON public.project_messages
  FOR INSERT TO authenticated WITH CHECK (project_id IN (
    SELECT p.id FROM public.projects p WHERE p.client_id IN (SELECT public.auth_client_ids())));

DROP POLICY IF EXISTS "client can read own visible reports" ON public.analytics_saved_reports;
CREATE POLICY "client can read own visible reports scoped" ON public.analytics_saved_reports
  FOR SELECT TO authenticated
  USING (visible_to_client = true AND client_id IN (SELECT public.auth_client_ids()));

DROP POLICY IF EXISTS "client can read own analytics sharing" ON public.portal_analytics_sharing;
CREATE POLICY "client can read own analytics sharing scoped" ON public.portal_analytics_sharing
  FOR SELECT TO authenticated USING (client_id IN (SELECT public.auth_client_ids()));

DROP POLICY IF EXISTS "client can read analytics_fact_sales" ON public.analytics_fact_sales;
CREATE POLICY "client can read analytics_fact_sales scoped" ON public.analytics_fact_sales
  FOR SELECT TO authenticated
  USING (public.is_admin() OR public.portal_can_see_sharing(period_id, branch_id, category_id));

DROP POLICY IF EXISTS "client can read analytics_fact_inventory" ON public.analytics_fact_inventory;
CREATE POLICY "client can read analytics_fact_inventory scoped" ON public.analytics_fact_inventory
  FOR SELECT TO authenticated
  USING (public.is_admin() OR public.portal_can_see_sharing(period_id, branch_id, category_id));

DROP POLICY IF EXISTS "client can read analytics_fact_pricing" ON public.analytics_fact_pricing;
CREATE POLICY "client can read analytics_fact_pricing scoped" ON public.analytics_fact_pricing
  FOR SELECT TO authenticated
  USING (public.is_admin() OR public.portal_can_see_sharing(period_id, branch_id, category_id));

DROP POLICY IF EXISTS "client can read analytics products" ON public.analytics_products;
DROP POLICY IF EXISTS "client can read analytics_products" ON public.analytics_products;
CREATE POLICY "client can read analytics_products scoped" ON public.analytics_products
  FOR SELECT TO authenticated
  USING (public.is_admin() OR category_id IN (
    SELECT sh.category_id FROM public.portal_analytics_sharing sh
    WHERE sh.client_id IN (SELECT public.auth_client_ids())
      AND sh.visible AND sh.category_id IS NOT NULL));

DROP POLICY IF EXISTS "client can read analytics branches" ON public.analytics_branches;
DROP POLICY IF EXISTS "client can read analytics_branches" ON public.analytics_branches;
CREATE POLICY "client can read analytics_branches scoped" ON public.analytics_branches
  FOR SELECT TO authenticated
  USING (public.is_admin() OR EXISTS (
    SELECT 1 FROM public.portal_analytics_sharing sh
    WHERE sh.client_id IN (SELECT public.auth_client_ids()) AND sh.visible
      AND (sh.branch_id = public.analytics_branches.id OR sh.branch_id IS NULL)));

DROP POLICY IF EXISTS "client can read analytics categories" ON public.analytics_categories;
DROP POLICY IF EXISTS "client can read analytics_categories" ON public.analytics_categories;
CREATE POLICY "client can read analytics_categories scoped" ON public.analytics_categories
  FOR SELECT TO authenticated
  USING (public.is_admin() OR EXISTS (
    SELECT 1 FROM public.portal_analytics_sharing sh
    WHERE sh.client_id IN (SELECT public.auth_client_ids()) AND sh.visible
      AND (sh.category_id = public.analytics_categories.id OR sh.category_id IS NULL)));

DROP POLICY IF EXISTS "client can read analytics periods" ON public.analytics_periods;
DROP POLICY IF EXISTS "client can read analytics_periods" ON public.analytics_periods;
CREATE POLICY "client can read analytics_periods scoped" ON public.analytics_periods
  FOR SELECT TO authenticated
  USING (public.is_admin() OR id IN (
    SELECT sh.period_id FROM public.portal_analytics_sharing sh
    WHERE sh.client_id IN (SELECT public.auth_client_ids()) AND sh.visible));

DROP POLICY IF EXISTS "client can read analytics_suppliers" ON public.analytics_suppliers;
CREATE POLICY "client can read analytics_suppliers scoped" ON public.analytics_suppliers
  FOR SELECT TO authenticated
  USING (public.is_admin() OR EXISTS (
    SELECT 1 FROM public.analytics_fact_sales fs
    WHERE fs.supplier_id = public.analytics_suppliers.id
      AND public.portal_can_see_sharing(fs.period_id, fs.branch_id, fs.category_id)));

DROP POLICY IF EXISTS "staff_read_suppliers" ON public.analytics_suppliers;
DROP POLICY IF EXISTS "admin_manage_suppliers" ON public.analytics_suppliers;
DROP POLICY IF EXISTS "staff_read_stock_movements" ON public.analytics_fact_stock_movements;
DROP POLICY IF EXISTS "admin_manage_stock_movements" ON public.analytics_fact_stock_movements;
DROP POLICY IF EXISTS "staff_read_pricing" ON public.analytics_fact_pricing;
DROP POLICY IF EXISTS "admin_manage_pricing" ON public.analytics_fact_pricing;
CREATE POLICY "staff_read_suppliers" ON public.analytics_suppliers FOR SELECT TO authenticated
  USING (public.user_role() = ANY(ARRAY['super_admin','crm_admin','finance']));
CREATE POLICY "admin_manage_suppliers" ON public.analytics_suppliers FOR ALL TO authenticated
  USING (public.user_role() = ANY(ARRAY['super_admin','crm_admin']));
CREATE POLICY "staff_read_stock_movements" ON public.analytics_fact_stock_movements FOR SELECT TO authenticated
  USING (public.user_role() = ANY(ARRAY['super_admin','crm_admin','finance']));
CREATE POLICY "admin_manage_stock_movements" ON public.analytics_fact_stock_movements FOR ALL TO authenticated
  USING (public.user_role() = ANY(ARRAY['super_admin','crm_admin']));
CREATE POLICY "staff_read_pricing" ON public.analytics_fact_pricing FOR SELECT TO authenticated
  USING (public.user_role() = ANY(ARRAY['super_admin','crm_admin','finance']));
CREATE POLICY "admin_manage_pricing" ON public.analytics_fact_pricing FOR ALL TO authenticated
  USING (public.user_role() = ANY(ARRAY['super_admin','crm_admin']));
DROP POLICY IF EXISTS "staff_read_automations" ON public.automations;
DROP POLICY IF EXISTS "admin_manage_automations" ON public.automations;
CREATE POLICY "staff_read_automations" ON public.automations FOR SELECT TO authenticated
  USING (public.user_role() = ANY(ARRAY['super_admin','crm_admin']));
CREATE POLICY "admin_manage_automations" ON public.automations FOR ALL TO authenticated
  USING (public.user_role() = ANY(ARRAY['super_admin','crm_admin']));
DROP POLICY IF EXISTS "staff_read_templates" ON public.templates;
DROP POLICY IF EXISTS "admin_manage_templates" ON public.templates;
CREATE POLICY "staff_read_templates" ON public.templates FOR SELECT TO authenticated
  USING (public.user_role() = ANY(ARRAY['super_admin','cms_admin']));
CREATE POLICY "admin_manage_templates" ON public.templates FOR ALL TO authenticated
  USING (public.user_role() = ANY(ARRAY['super_admin','cms_admin']));
DROP POLICY IF EXISTS "admin can read branch_summary" ON analytics_fact_branch_summary;
DROP POLICY IF EXISTS "admin can write branch_summary" ON analytics_fact_branch_summary;
CREATE POLICY "admin can read branch_summary" ON analytics_fact_branch_summary FOR SELECT TO authenticated
  USING (public.is_admin());
CREATE POLICY "admin can write branch_summary" ON analytics_fact_branch_summary FOR ALL TO authenticated
  USING (public.is_admin());

CREATE INDEX IF NOT EXISTS idx_projects_client_created ON public.projects (client_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_bookings_client_start  ON public.bookings (client_id, start_date DESC);
CREATE INDEX IF NOT EXISTS idx_invoices_client_due    ON public.invoices (client_id, due_date DESC);
CREATE INDEX IF NOT EXISTS idx_conversations_client_last ON public.conversations (client_id, last_message_at DESC NULLS LAST);
CREATE INDEX IF NOT EXISTS idx_documents_client_visible  ON public.documents (client_id, created_at DESC) WHERE visible_to_client;
CREATE INDEX IF NOT EXISTS idx_documents_project_visible ON public.documents (project_id, created_at DESC) WHERE visible_to_client;
CREATE INDEX IF NOT EXISTS idx_deliverables_client_visible  ON public.deliverables (client_id, created_at DESC) WHERE visible_to_client;
CREATE INDEX IF NOT EXISTS idx_deliverables_project_visible ON public.deliverables (project_id, created_at DESC) WHERE visible_to_client;
CREATE INDEX IF NOT EXISTS idx_messages_conversation_created ON public.messages (conversation_id, created_at);
CREATE INDEX IF NOT EXISTS idx_activity_log_client_created   ON public.activity_log (client_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_client_created  ON public.notifications (client_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_user_created    ON public.notifications (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_analytics_fact_sales_pbc      ON public.analytics_fact_sales (period_id, branch_id, category_id);
CREATE INDEX IF NOT EXISTS idx_analytics_fact_inventory_pbc  ON public.analytics_fact_inventory (period_id, branch_id, category_id);
CREATE INDEX IF NOT EXISTS idx_analytics_fact_pricing_pb     ON public.analytics_fact_pricing (period_id, branch_id);
CREATE INDEX IF NOT EXISTS idx_analytics_fact_pricing_b_eff  ON public.analytics_fact_pricing (branch_id, effective_date DESC);
CREATE INDEX IF NOT EXISTS idx_sharing_client_visible ON public.portal_analytics_sharing (client_id, visible, period_id, branch_id, category_id);

COMMIT;
