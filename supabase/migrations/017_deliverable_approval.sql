-- Add approval workflow columns to deliverables table
ALTER TABLE public.deliverables
  ADD COLUMN IF NOT EXISTS approval_status text DEFAULT 'pending'
    CHECK (approval_status IN ('pending', 'approved', 'rejected')),
  ADD COLUMN IF NOT EXISTS client_feedback text,
  ADD COLUMN IF NOT EXISTS reviewed_at timestamptz,
  ADD COLUMN IF NOT EXISTS reviewed_by uuid REFERENCES auth.users(id);

-- Index for filtering by approval status
CREATE INDEX IF NOT EXISTS idx_deliverables_approval ON public.deliverables(approval_status, client_id);
