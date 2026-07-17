CREATE TABLE IF NOT EXISTS public.invoice_payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id uuid NOT NULL REFERENCES public.invoices(id) ON DELETE CASCADE,
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  method text NOT NULL CHECK (method IN ('mpesa','card','bank_transfer','cash','other')),
  reference text,
  amount numeric(15,2) NOT NULL,
  status text DEFAULT 'pending' CHECK (status IN ('pending','completed','failed','refunded')),
  mpesa_receipt text,
  mpesa_phone text,
  paid_at timestamptz,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_invoice_payments_invoice ON public.invoice_payments(invoice_id);
CREATE INDEX IF NOT EXISTS idx_invoice_payments_client ON public.invoice_payments(client_id);

ALTER TABLE public.invoice_payments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "client can read their payments" ON public.invoice_payments;
DROP POLICY IF EXISTS "client can insert their payments" ON public.invoice_payments;
DROP POLICY IF EXISTS "admin can manage payments" ON public.invoice_payments;

CREATE POLICY "client can read their payments" ON public.invoice_payments
  FOR SELECT TO authenticated
  USING (
    client_id IN (SELECT id FROM public.clients WHERE user_id = auth.uid())
  );

CREATE POLICY "client can insert their payments" ON public.invoice_payments
  FOR INSERT TO authenticated
  WITH CHECK (
    client_id IN (SELECT id FROM public.clients WHERE user_id = auth.uid())
  );

CREATE POLICY "admin can manage payments" ON public.invoice_payments
  FOR ALL TO authenticated USING (public.is_admin());
