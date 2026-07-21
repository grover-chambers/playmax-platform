-- Add pdf_base64 column to deliverables for storing generated PDF reports inline
ALTER TABLE public.deliverables
  ADD COLUMN IF NOT EXISTS pdf_base64 text;
