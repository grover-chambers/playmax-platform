proBEGIN;

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TABLE IF NOT EXISTS public.clients (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  email text,
  phone text,
  company text,
  industry text,
  website text,
  status text DEFAULT 'active' CHECK (status IN ('active','inactive','churned')),
  assigned_to uuid REFERENCES auth.users(id),
  metadata jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.leads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  company text NOT NULL,
  contact_name text,
  email text NOT NULL,
  phone text,
  source text NOT NULL DEFAULT 'website',
  status text NOT NULL DEFAULT 'new' CHECK (status IN ('new','contacted','qualified','proposal','won','lost')),
  value numeric(12,2) DEFAULT 0,
  intent text,
  assigned_to uuid REFERENCES auth.users(id),
  notes text,
  description text,
  service_interest text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.projects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid REFERENCES public.clients(id),
  name text NOT NULL,
  type text NOT NULL CHECK (type IN ('market_research','brand_strategy','billboard_campaign','event_activation','data_analytics','campaign_management')),
  status text DEFAULT 'draft' CHECK (status IN ('draft','active','in_progress','review','completed','cancelled')),
  value numeric(12,2) DEFAULT 0,
  start_date date,
  end_date date,
  assigned_to uuid REFERENCES auth.users(id),
  brief text,
  metadata jsonb DEFAULT '{}',
  progress integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid REFERENCES public.projects(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  status text DEFAULT 'todo' CHECK (status IN ('todo','in_progress','done','blocked')),
  priority text DEFAULT 'medium' CHECK (priority IN ('low','medium','high','urgent')),
  assigned_to uuid REFERENCES auth.users(id),
  due_date date,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.inventory (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  type text NOT NULL CHECK (type IN ('billboard','digital_screen','banner_site','backlit')),
  name text NOT NULL,
  location text,
  area text,
  size text,
  resolution text,
  daily_impressions integer DEFAULT 0,
  price numeric(12,2) NOT NULL,
  status text DEFAULT 'available' CHECK (status IN ('available','booked','maintenance')),
  booked_by uuid REFERENCES public.clients(id),
  booked_until date,
  metadata jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.bookings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid REFERENCES public.clients(id),
  inventory_id uuid REFERENCES public.inventory(id),
  start_date date NOT NULL,
  end_date date NOT NULL,
  status text DEFAULT 'pending' CHECK (status IN ('pending','confirmed','completed','cancelled')),
  total_price numeric(12,2) NOT NULL,
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.invoices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_number text NOT NULL UNIQUE,
  client_id uuid REFERENCES public.clients(id),
  project_id uuid REFERENCES public.projects(id),
  amount numeric(12,2) NOT NULL,
  status text DEFAULT 'draft' CHECK (status IN ('draft','sent','paid','overdue','cancelled')),
  issued_date date,
  due_date date,
  paid_date date,
  notes text,
  line_items jsonb DEFAULT '[]',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.conversations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid REFERENCES public.clients(id),
  contact_name text NOT NULL,
  channel text NOT NULL CHECK (channel IN ('whatsapp','email','sms')),
  status text DEFAULT 'open' CHECK (status IN ('open','closed')),
  last_message_at timestamptz,
  assigned_to uuid REFERENCES auth.users(id),
  metadata jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid REFERENCES public.conversations(id) ON DELETE CASCADE,
  direction text NOT NULL CHECK (direction IN ('inbound','outbound')),
  text text NOT NULL,
  channel text NOT NULL CHECK (channel IN ('whatsapp','email','sms')),
  sender_name text,
  is_automation boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.deliverables (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid REFERENCES public.projects(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  file_url text,
  file_type text,
  file_size text,
  uploaded_by uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.research_projects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid REFERENCES public.clients(id),
  project_id uuid REFERENCES public.projects(id),
  type text NOT NULL CHECK (type IN ('market_research','competitor_analysis','consumer_survey','brand_audit')),
  status text DEFAULT 'upcoming' CHECK (status IN ('upcoming','in_progress','completed','cancelled')),
  progress integer DEFAULT 0,
  value numeric(12,2) DEFAULT 0,
  due_date date,
  survey_responses integer DEFAULT 0,
  metadata jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.automations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  type text NOT NULL,
  enabled boolean DEFAULT true,
  config jsonb DEFAULT '{}',
  last_triggered_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  type text NOT NULL,
  content text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.engagements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid REFERENCES public.clients(id) NOT NULL,
  engagement_type text NOT NULL,
  date date NOT NULL,
  staff_involved text[] DEFAULT '{}',
  billable boolean DEFAULT false,
  billing_rate numeric(12,2),
  flat_fee numeric(12,2),
  summary text,
  project_id uuid REFERENCES public.projects(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.activity_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid REFERENCES public.clients(id),
  project_id uuid REFERENCES public.projects(id),
  user_id uuid REFERENCES auth.users(id),
  action text NOT NULL,
  description text,
  metadata jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.deliverables ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.research_projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.automations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.engagements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activity_log ENABLE ROW LEVEL SECURITY;

-- Helper: extract user role from JWT metadata
CREATE OR REPLACE FUNCTION public.user_role() RETURNS text AS $$
  SELECT COALESCE(auth.jwt() -> 'user_metadata' ->> 'role', 'client');
$$ LANGUAGE sql STABLE;

-- Helper: check if user has an admin-level role
CREATE OR REPLACE FUNCTION public.is_admin() RETURNS boolean AS $$
  SELECT public.user_role() = ANY(ARRAY['super_admin', 'crm_admin', 'cms_admin']);
$$ LANGUAGE sql STABLE;

-- ── Clients ──────────────────────────────────────────
DROP POLICY IF EXISTS "admin can read all clients" ON public.clients;
CREATE POLICY "admin can read all clients" ON public.clients FOR SELECT TO authenticated USING (public.is_admin() OR assigned_to = auth.uid());
DROP POLICY IF EXISTS "admin can insert clients" ON public.clients;
CREATE POLICY "admin can insert clients" ON public.clients FOR INSERT TO authenticated WITH CHECK (public.is_admin());
DROP POLICY IF EXISTS "admin can update clients" ON public.clients;
CREATE POLICY "admin can update clients" ON public.clients FOR UPDATE TO authenticated USING (public.is_admin() OR assigned_to = auth.uid()) WITH CHECK (public.is_admin() OR assigned_to = auth.uid());
DROP POLICY IF EXISTS "admin can delete clients" ON public.clients;
CREATE POLICY "admin can delete clients" ON public.clients FOR DELETE TO authenticated USING (public.is_admin());

-- ── Leads ────────────────────────────────────────────
DROP POLICY IF EXISTS "Anyone can insert leads" ON public.leads;
CREATE POLICY "Anyone can insert leads" ON public.leads FOR INSERT WITH CHECK (true);
DROP POLICY IF EXISTS "admin or assigned can read leads" ON public.leads;
CREATE POLICY "admin or assigned can read leads" ON public.leads FOR SELECT TO authenticated USING (public.is_admin() OR assigned_to = auth.uid());
DROP POLICY IF EXISTS "admin or assigned can update leads" ON public.leads;
CREATE POLICY "admin or assigned can update leads" ON public.leads FOR UPDATE TO authenticated USING (public.is_admin() OR assigned_to = auth.uid()) WITH CHECK (public.is_admin() OR assigned_to = auth.uid());
DROP POLICY IF EXISTS "admin can delete leads" ON public.leads;
CREATE POLICY "admin can delete leads" ON public.leads FOR DELETE TO authenticated USING (public.is_admin());

-- ── Projects ─────────────────────────────────────────
DROP POLICY IF EXISTS "admin or assigned can read projects" ON public.projects;
CREATE POLICY "admin or assigned can read projects" ON public.projects FOR SELECT TO authenticated USING (public.is_admin() OR assigned_to = auth.uid());
DROP POLICY IF EXISTS "admin can insert projects" ON public.projects;
CREATE POLICY "admin can insert projects" ON public.projects FOR INSERT TO authenticated WITH CHECK (public.is_admin());
DROP POLICY IF EXISTS "admin or assigned can update projects" ON public.projects;
CREATE POLICY "admin or assigned can update projects" ON public.projects FOR UPDATE TO authenticated USING (public.is_admin() OR assigned_to = auth.uid()) WITH CHECK (public.is_admin() OR assigned_to = auth.uid());
DROP POLICY IF EXISTS "admin can delete projects" ON public.projects;
CREATE POLICY "admin can delete projects" ON public.projects FOR DELETE TO authenticated USING (public.is_admin());

-- ── Tasks ────────────────────────────────────────────
DROP POLICY IF EXISTS "admin or assigned can read tasks" ON public.tasks;
CREATE POLICY "admin or assigned can read tasks" ON public.tasks FOR SELECT TO authenticated USING (public.is_admin() OR assigned_to = auth.uid());
DROP POLICY IF EXISTS "admin can insert tasks" ON public.tasks;
CREATE POLICY "admin can insert tasks" ON public.tasks FOR INSERT TO authenticated WITH CHECK (public.is_admin());
DROP POLICY IF EXISTS "admin or assigned can update tasks" ON public.tasks;
CREATE POLICY "admin or assigned can update tasks" ON public.tasks FOR UPDATE TO authenticated USING (public.is_admin() OR assigned_to = auth.uid()) WITH CHECK (public.is_admin() OR assigned_to = auth.uid());
DROP POLICY IF EXISTS "admin can delete tasks" ON public.tasks;
CREATE POLICY "admin can delete tasks" ON public.tasks FOR DELETE TO authenticated USING (public.is_admin());

-- ── Inventory ────────────────────────────────────────
DROP POLICY IF EXISTS "authenticated can read inventory" ON public.inventory;
CREATE POLICY "authenticated can read inventory" ON public.inventory FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "admin can insert inventory" ON public.inventory;
CREATE POLICY "admin can insert inventory" ON public.inventory FOR INSERT TO authenticated WITH CHECK (public.is_admin());
DROP POLICY IF EXISTS "admin can update inventory" ON public.inventory;
CREATE POLICY "admin can update inventory" ON public.inventory FOR UPDATE TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
DROP POLICY IF EXISTS "admin can delete inventory" ON public.inventory;
CREATE POLICY "admin can delete inventory" ON public.inventory FOR DELETE TO authenticated USING (public.is_admin());

-- ── Bookings ─────────────────────────────────────────
DROP POLICY IF EXISTS "authenticated can read bookings" ON public.bookings;
CREATE POLICY "authenticated can read bookings" ON public.bookings FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "authenticated can insert bookings" ON public.bookings;
CREATE POLICY "authenticated can insert bookings" ON public.bookings FOR INSERT TO authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "authenticated can update bookings" ON public.bookings;
CREATE POLICY "authenticated can update bookings" ON public.bookings FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "admin can delete bookings" ON public.bookings;
CREATE POLICY "admin can delete bookings" ON public.bookings FOR DELETE TO authenticated USING (public.is_admin());

-- ── Invoices ─────────────────────────────────────────
DROP POLICY IF EXISTS "finance or admin can read invoices" ON public.invoices;
CREATE POLICY "finance or admin can read invoices" ON public.invoices FOR SELECT TO authenticated USING (public.is_admin() OR public.user_role() = 'finance');
DROP POLICY IF EXISTS "finance or admin can insert invoices" ON public.invoices;
CREATE POLICY "finance or admin can insert invoices" ON public.invoices FOR INSERT TO authenticated WITH CHECK (public.is_admin() OR public.user_role() = 'finance');
DROP POLICY IF EXISTS "finance or admin can update invoices" ON public.invoices;
CREATE POLICY "finance or admin can update invoices" ON public.invoices FOR UPDATE TO authenticated USING (public.is_admin() OR public.user_role() = 'finance') WITH CHECK (public.is_admin() OR public.user_role() = 'finance');
DROP POLICY IF EXISTS "admin can delete invoices" ON public.invoices;
CREATE POLICY "admin can delete invoices" ON public.invoices FOR DELETE TO authenticated USING (public.is_admin());

-- ── Conversations ────────────────────────────────────
DROP POLICY IF EXISTS "admin or assigned can read conversations" ON public.conversations;
CREATE POLICY "admin or assigned can read conversations" ON public.conversations FOR SELECT TO authenticated USING (public.is_admin() OR assigned_to = auth.uid());
DROP POLICY IF EXISTS "admin or assigned can insert conversations" ON public.conversations;
CREATE POLICY "admin or assigned can insert conversations" ON public.conversations FOR INSERT TO authenticated WITH CHECK (public.is_admin() OR assigned_to = auth.uid());
DROP POLICY IF EXISTS "admin or assigned can update conversations" ON public.conversations;
CREATE POLICY "admin or assigned can update conversations" ON public.conversations FOR UPDATE TO authenticated USING (public.is_admin() OR assigned_to = auth.uid()) WITH CHECK (public.is_admin() OR assigned_to = auth.uid());
DROP POLICY IF EXISTS "admin can delete conversations" ON public.conversations;
CREATE POLICY "admin can delete conversations" ON public.conversations FOR DELETE TO authenticated USING (public.is_admin());

-- ── Messages ─────────────────────────────────────────
DROP POLICY IF EXISTS "authenticated can read messages" ON public.messages;
CREATE POLICY "authenticated can read messages" ON public.messages FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "authenticated can insert messages" ON public.messages;
CREATE POLICY "authenticated can insert messages" ON public.messages FOR INSERT TO authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "admin can delete messages" ON public.messages;
CREATE POLICY "admin can delete messages" ON public.messages FOR DELETE TO authenticated USING (public.is_admin());

-- ── Deliverables ─────────────────────────────────────
DROP POLICY IF EXISTS "admin or uploader can read deliverables" ON public.deliverables;
CREATE POLICY "admin or uploader can read deliverables" ON public.deliverables FOR SELECT TO authenticated USING (public.is_admin() OR uploaded_by = auth.uid());
DROP POLICY IF EXISTS "admin or uploader can insert deliverables" ON public.deliverables;
CREATE POLICY "admin or uploader can insert deliverables" ON public.deliverables FOR INSERT TO authenticated WITH CHECK (public.is_admin() OR uploaded_by = auth.uid());
DROP POLICY IF EXISTS "admin or uploader can delete deliverables" ON public.deliverables;
CREATE POLICY "admin or uploader can delete deliverables" ON public.deliverables FOR DELETE TO authenticated USING (public.is_admin() OR uploaded_by = auth.uid());

-- ── Research Projects ────────────────────────────────
DROP POLICY IF EXISTS "admin or assigned can read research_projects" ON public.research_projects;
CREATE POLICY "admin or assigned can read research_projects" ON public.research_projects FOR SELECT TO authenticated USING (public.is_admin() OR auth.uid() IN (SELECT assigned_to FROM public.projects WHERE id = research_projects.project_id));
DROP POLICY IF EXISTS "admin can insert research_projects" ON public.research_projects;
CREATE POLICY "admin can insert research_projects" ON public.research_projects FOR INSERT TO authenticated WITH CHECK (public.is_admin());
DROP POLICY IF EXISTS "admin can update research_projects" ON public.research_projects;
CREATE POLICY "admin can update research_projects" ON public.research_projects FOR UPDATE TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
DROP POLICY IF EXISTS "admin can delete research_projects" ON public.research_projects;
CREATE POLICY "admin can delete research_projects" ON public.research_projects FOR DELETE TO authenticated USING (public.is_admin());

-- ── Engagements ──────────────────────────────────────
DROP POLICY IF EXISTS "admin or involved can read engagements" ON public.engagements;
CREATE POLICY "admin or involved can read engagements" ON public.engagements FOR SELECT TO authenticated USING (public.is_admin() OR auth.uid()::text = ANY(staff_involved));
DROP POLICY IF EXISTS "admin can insert engagements" ON public.engagements;
CREATE POLICY "admin can insert engagements" ON public.engagements FOR INSERT TO authenticated WITH CHECK (public.is_admin());
DROP POLICY IF EXISTS "admin can update engagements" ON public.engagements;
CREATE POLICY "admin can update engagements" ON public.engagements FOR UPDATE TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
DROP POLICY IF EXISTS "admin can delete engagements" ON public.engagements;
CREATE POLICY "admin can delete engagements" ON public.engagements FOR DELETE TO authenticated USING (public.is_admin());

-- ── Activity Log ─────────────────────────────────────
DROP POLICY IF EXISTS "authenticated can read activity_log" ON public.activity_log;
CREATE POLICY "authenticated can read activity_log" ON public.activity_log FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "authenticated can insert activity_log" ON public.activity_log;
CREATE POLICY "authenticated can insert activity_log" ON public.activity_log FOR INSERT TO authenticated WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_clients_status ON public.clients (status);
CREATE INDEX IF NOT EXISTS idx_clients_assigned_to ON public.clients (assigned_to);
CREATE INDEX IF NOT EXISTS idx_clients_created_at ON public.clients (created_at);

CREATE INDEX IF NOT EXISTS idx_leads_status ON public.leads (status);
CREATE INDEX IF NOT EXISTS idx_leads_source ON public.leads (source);
CREATE INDEX IF NOT EXISTS idx_leads_assigned_to ON public.leads (assigned_to);
CREATE INDEX IF NOT EXISTS idx_leads_created_at ON public.leads (created_at);

CREATE INDEX IF NOT EXISTS idx_projects_client_id ON public.projects (client_id);
CREATE INDEX IF NOT EXISTS idx_projects_status ON public.projects (status);
CREATE INDEX IF NOT EXISTS idx_projects_type ON public.projects (type);
CREATE INDEX IF NOT EXISTS idx_projects_assigned_to ON public.projects (assigned_to);
CREATE INDEX IF NOT EXISTS idx_projects_created_at ON public.projects (created_at);

CREATE INDEX IF NOT EXISTS idx_tasks_project_id ON public.tasks (project_id);
CREATE INDEX IF NOT EXISTS idx_tasks_status ON public.tasks (status);
CREATE INDEX IF NOT EXISTS idx_tasks_priority ON public.tasks (priority);
CREATE INDEX IF NOT EXISTS idx_tasks_assigned_to ON public.tasks (assigned_to);
CREATE INDEX IF NOT EXISTS idx_tasks_due_date ON public.tasks (due_date);

CREATE INDEX IF NOT EXISTS idx_inventory_type ON public.inventory (type);
CREATE INDEX IF NOT EXISTS idx_inventory_status ON public.inventory (status);
CREATE INDEX IF NOT EXISTS idx_inventory_location ON public.inventory (location);
CREATE INDEX IF NOT EXISTS idx_inventory_area ON public.inventory (area);
CREATE INDEX IF NOT EXISTS idx_inventory_booked_by ON public.inventory (booked_by);

CREATE INDEX IF NOT EXISTS idx_bookings_client_id ON public.bookings (client_id);
CREATE INDEX IF NOT EXISTS idx_bookings_inventory_id ON public.bookings (inventory_id);
CREATE INDEX IF NOT EXISTS idx_bookings_status ON public.bookings (status);
CREATE INDEX IF NOT EXISTS idx_bookings_start_date ON public.bookings (start_date);
CREATE INDEX IF NOT EXISTS idx_bookings_end_date ON public.bookings (end_date);

CREATE INDEX IF NOT EXISTS idx_invoices_client_id ON public.invoices (client_id);
CREATE INDEX IF NOT EXISTS idx_invoices_project_id ON public.invoices (project_id);
CREATE INDEX IF NOT EXISTS idx_invoices_status ON public.invoices (status);
CREATE INDEX IF NOT EXISTS idx_invoices_invoice_number ON public.invoices (invoice_number);
CREATE INDEX IF NOT EXISTS idx_invoices_due_date ON public.invoices (due_date);

CREATE INDEX IF NOT EXISTS idx_conversations_client_id ON public.conversations (client_id);
CREATE INDEX IF NOT EXISTS idx_conversations_channel ON public.conversations (channel);
CREATE INDEX IF NOT EXISTS idx_conversations_status ON public.conversations (status);
CREATE INDEX IF NOT EXISTS idx_conversations_assigned_to ON public.conversations (assigned_to);
CREATE INDEX IF NOT EXISTS idx_conversations_last_message_at ON public.conversations (last_message_at);

CREATE INDEX IF NOT EXISTS idx_messages_conversation_id ON public.messages (conversation_id);
CREATE INDEX IF NOT EXISTS idx_messages_channel ON public.messages (channel);
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON public.messages (created_at);

CREATE INDEX IF NOT EXISTS idx_deliverables_project_id ON public.deliverables (project_id);
CREATE INDEX IF NOT EXISTS idx_deliverables_uploaded_by ON public.deliverables (uploaded_by);

CREATE INDEX IF NOT EXISTS idx_research_projects_client_id ON public.research_projects (client_id);
CREATE INDEX IF NOT EXISTS idx_research_projects_project_id ON public.research_projects (project_id);
CREATE INDEX IF NOT EXISTS idx_research_projects_type ON public.research_projects (type);
CREATE INDEX IF NOT EXISTS idx_research_projects_status ON public.research_projects (status);
CREATE INDEX IF NOT EXISTS idx_research_projects_due_date ON public.research_projects (due_date);

CREATE INDEX IF NOT EXISTS idx_automations_type ON public.automations (type);
CREATE INDEX IF NOT EXISTS idx_automations_enabled ON public.automations (enabled);

CREATE INDEX IF NOT EXISTS idx_templates_type ON public.templates (type);

CREATE INDEX IF NOT EXISTS idx_engagements_client_id ON public.engagements (client_id);
CREATE INDEX IF NOT EXISTS idx_engagements_project_id ON public.engagements (project_id);
CREATE INDEX IF NOT EXISTS idx_engagements_date ON public.engagements (date);
CREATE INDEX IF NOT EXISTS idx_engagements_engagement_type ON public.engagements (engagement_type);

CREATE INDEX IF NOT EXISTS idx_activity_log_client_id ON public.activity_log (client_id);
CREATE INDEX IF NOT EXISTS idx_activity_log_project_id ON public.activity_log (project_id);
CREATE INDEX IF NOT EXISTS idx_activity_log_user_id ON public.activity_log (user_id);
CREATE INDEX IF NOT EXISTS idx_activity_log_created_at ON public.activity_log (created_at);

DROP TRIGGER IF EXISTS set_updated_at ON public.clients;
CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.clients FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
DROP TRIGGER IF EXISTS set_updated_at ON public.leads;
CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.leads FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
DROP TRIGGER IF EXISTS set_updated_at ON public.projects;
CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.projects FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
DROP TRIGGER IF EXISTS set_updated_at ON public.tasks;
CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.tasks FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
DROP TRIGGER IF EXISTS set_updated_at ON public.inventory;
CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.inventory FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
DROP TRIGGER IF EXISTS set_updated_at ON public.bookings;
CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.bookings FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
DROP TRIGGER IF EXISTS set_updated_at ON public.invoices;
CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.invoices FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
DROP TRIGGER IF EXISTS set_updated_at ON public.conversations;
CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.conversations FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
DROP TRIGGER IF EXISTS set_updated_at ON public.engagements;
CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.engagements FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
DROP TRIGGER IF EXISTS set_updated_at ON public.research_projects;
CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.research_projects FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
DROP TRIGGER IF EXISTS set_updated_at ON public.automations;
CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.automations FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
DROP TRIGGER IF EXISTS set_updated_at ON public.templates;
CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.templates FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ── ARTICLES (CMS-managed blog content) ──────────────
CREATE TABLE IF NOT EXISTS public.articles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text UNIQUE NOT NULL,
  title text NOT NULL,
  category text NOT NULL DEFAULT 'General',
  author text NOT NULL DEFAULT 'Market Link Team',
  date date NOT NULL DEFAULT CURRENT_DATE,
  read_time text NOT NULL DEFAULT '5 min read',
  excerpt text NOT NULL,
  content text NOT NULL,
  image_url text NOT NULL,
  image_alt text NOT NULL DEFAULT '',
  tags text[] DEFAULT '{}',
  published boolean NOT NULL DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.articles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Articles are publicly readable" ON public.articles;
CREATE POLICY "Articles are publicly readable"
  ON public.articles FOR SELECT
  USING (published = true OR public.is_admin());

DROP POLICY IF EXISTS "Admins can manage articles" ON public.articles;
CREATE POLICY "Admins can manage articles"
  ON public.articles FOR ALL
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

CREATE INDEX IF NOT EXISTS idx_articles_slug ON public.articles (slug);
CREATE INDEX IF NOT EXISTS idx_articles_published ON public.articles (published);
CREATE INDEX IF NOT EXISTS idx_articles_date ON public.articles (date DESC);

DROP TRIGGER IF EXISTS set_updated_at ON public.articles;
CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.articles
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

COMMIT;
