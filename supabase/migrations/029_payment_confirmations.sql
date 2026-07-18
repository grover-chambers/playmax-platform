-- Table for M-Pesa payment confirmation callbacks
CREATE TABLE IF NOT EXISTS public.payment_confirmations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  payment_id uuid NOT NULL REFERENCES public.invoice_payments(id) ON DELETE CASCADE,
  invoice_id uuid NOT NULL REFERENCES public.invoices(id) ON DELETE CASCADE,
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  transaction_id text,
  receipt_number text,
  phone_number text,
  amount numeric(15,2) NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','completed','failed')),
  raw_callback jsonb,
  created_at timestamptz DEFAULT now(),
  confirmed_at timestamptz
);

CREATE INDEX IF NOT EXISTS idx_payment_confirmations_payment ON public.payment_confirmations(payment_id);
CREATE INDEX IF NOT EXISTS idx_payment_confirmations_invoice ON public.payment_confirmations(invoice_id);

ALTER TABLE public.payment_confirmations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "client can read their payment confirmations" ON public.payment_confirmations
  FOR SELECT TO authenticated
  USING (
    client_id IN (SELECT id FROM public.clients WHERE user_id = auth.uid())
  );

CREATE POLICY "admin can manage payment confirmations" ON public.payment_confirmations
  FOR ALL TO authenticated USING (public.is_admin());
