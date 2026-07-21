BEGIN;

-- 1. Create the NICE Maize Flour Deal Brief project
DO $$
DECLARE
  nice_project_id uuid;
  nice_client_id uuid := 'e2f9301b-e1ea-4026-886f-7f44e55770b5';
  nice_user_id uuid := 'fe5a70fb-304e-44d3-9611-3b2e05ebc60b';
  nice_research_id uuid := '973a7c31-4670-4fbc-804f-43b868c6d5ee';
BEGIN
  INSERT INTO public.projects (id, client_id, name, type, status, value, progress, brief, start_date, end_date)
  VALUES (
    gen_random_uuid(),
    nice_client_id,
    'NICE Maize Flour Deal Brief',
    'market_research',
    'active',
    850000,
    65,
    'Analytics-driven supplier deal brief for NICE Supermarkets Maize Flour category. Covers 11 branches, 29 suppliers, KES 2.1B total market. Goal: negotiate better shelf placement and pricing based on data insights.',
    '2026-06-01',
    '2026-09-30'
  )
  ON CONFLICT DO NOTHING
  RETURNING id INTO nice_project_id;

  IF nice_project_id IS NULL THEN
    SELECT id INTO nice_project_id FROM public.projects
    WHERE client_id = nice_client_id AND name = 'NICE Maize Flour Deal Brief' LIMIT 1;
  END IF;

  UPDATE public.research_projects
  SET project_id = nice_project_id
  WHERE id = nice_research_id;

  UPDATE public.analytics_saved_reports
  SET project_id = nice_project_id
  WHERE client_id = nice_client_id AND project_id IS NULL;

  UPDATE public.deliverables
  SET project_id = nice_project_id
  WHERE client_id = nice_client_id AND project_id IS NULL;

  UPDATE public.reports
  SET project_id = nice_project_id
  WHERE client_id = nice_client_id AND project_id IS NULL;

  INSERT INTO public.project_members (project_id, user_id, role)
  VALUES
    (nice_project_id, nice_user_id, 'lead')
  ON CONFLICT DO NOTHING;

  INSERT INTO public.project_milestones (project_id, client_id, title, description, due_date, status, sort_order)
  VALUES
    (nice_project_id, nice_client_id, 'Data Ingestion', 'Ingest 12,790 rows of Maize Flour XLS data across 11 branches', '2026-06-15', 'completed', 1),
    (nice_project_id, nice_client_id, 'Market Analysis', 'Run 34+ analytics algorithms: market share, branch performance, supplier competition', '2026-07-01', 'completed', 2),
    (nice_project_id, nice_client_id, 'Report Generation', 'Generate 6 PDF reports + formal report with 5 key metrics', '2026-07-15', 'in_progress', 3),
    (nice_project_id, nice_client_id, 'Client Review', 'NICE team reviews findings and provides feedback', '2026-08-15', 'pending', 4),
    (nice_project_id, nice_client_id, 'Deal Presentation', 'Present data-driven deal brief to NICE procurement', '2026-09-30', 'pending', 5)
  ON CONFLICT DO NOTHING;

  INSERT INTO public.tasks (project_id, title, description, status, priority, assigned_to, due_date)
  VALUES
    (nice_project_id, 'Verify branch data accuracy', 'Cross-check sales figures across all 11 branches against XLS source', 'done', 'high', nice_user_id, '2026-06-20'),
    (nice_project_id, 'Run market share analysis', 'Calculate NICE market position: #4 of 29 suppliers, 5.5% share', 'done', 'high', nice_user_id, '2026-06-25'),
    (nice_project_id, 'Analyze branch performance', 'Compare revenue per branch: Engineer, Maua, Meru, Nyahururu, Thika CBD, Karatina, Naivasha, Nakuru, Nampak, Narok, HQ', 'done', 'medium', nice_user_id, '2026-07-01'),
    (nice_project_id, 'Generate PDF deliverables', 'Create 6 reports: Market Share Intelligence, Category Analysis, Client Performance, Supplier Competition, Branch Breakdown, Kanini Network', 'in_progress', 'high', nice_user_id, '2026-07-10'),
    (nice_project_id, 'Build competitor positioning map', 'Map top 10 suppliers by revenue and units across all branches', 'in_progress', 'medium', nice_user_id, '2026-07-15'),
    (nice_project_id, 'Draft deal brief narrative', 'Write executive summary and recommendation for NICE procurement team', 'todo', 'high', nice_user_id, '2026-08-01'),
    (nice_project_id, 'Prepare presentation deck', 'Create visuals and talking points for the deal presentation', 'todo', 'medium', nice_user_id, '2026-09-15')
  ON CONFLICT DO NOTHING;

  INSERT INTO public.project_notes (project_id, x, y, content, color, author_name, sort_order)
  VALUES
    (nice_project_id, 120, 100, 'KES 116.8M NICE revenue — 5.5% of KES 2.1B market', '#FCD34D', 'Analytics', 1),
    (nice_project_id, 400, 80, '#4 of 29 active suppliers — strong growth potential', '#60A5FA', 'Analytics', 2),
    (nice_project_id, 680, 120, '1,113,568 total units across 11 branches', '#34D399', 'Analytics', 3),
    (nice_project_id, 200, 350, '47% of market revenue has unmapped supplier data — opportunity gap', '#F472B6', 'Research', 4),
    (nice_project_id, 500, 380, 'Focus: negotiate shelf placement + volume discounts', '#A78BFA', 'Strategy', 5)
  ON CONFLICT DO NOTHING;

  INSERT INTO public.project_messages (project_id, author_id, author_name, text)
  VALUES
    (nice_project_id, nice_user_id, 'Analytics Team', 'Data ingestion complete. All 12,790 rows from 22 XLS files loaded across 11 branches.'),
    (nice_project_id, nice_user_id, 'Analytics Team', 'Market share analysis done. NICE ranks #4 with 5.5% share. Top 3 competitors hold 38% combined.'),
    (nice_project_id, nice_user_id, 'Project Lead', 'PDF reports generated and uploaded to deliverables. Ready for internal review before client handoff.')
  ON CONFLICT DO NOTHING;

END $$;

COMMIT;
