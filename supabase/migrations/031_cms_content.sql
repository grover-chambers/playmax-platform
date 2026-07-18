-- CMS content table for client-facing articles
CREATE TABLE IF NOT EXISTS public.cms_content (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid REFERENCES public.clients(id) ON DELETE SET NULL,
  title text NOT NULL,
  slug text NOT NULL UNIQUE,
  excerpt text,
  content text,
  category text DEFAULT 'general' CHECK (category IN ('general','insights','guide','update','case_study')),
  featured_image text,
  published boolean DEFAULT false,
  published_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_cms_content_published ON public.cms_content(published, published_at DESC);
CREATE INDEX IF NOT EXISTS idx_cms_content_client ON public.cms_content(client_id);

ALTER TABLE public.cms_content ENABLE ROW LEVEL SECURITY;

CREATE POLICY "anyone can read published content" ON public.cms_content
  FOR SELECT TO authenticated
  USING (published = true OR client_id IN (SELECT id FROM public.clients WHERE user_id = auth.uid()));

CREATE POLICY "admin can manage cms content" ON public.cms_content
  FOR ALL TO authenticated USING (public.is_admin());
