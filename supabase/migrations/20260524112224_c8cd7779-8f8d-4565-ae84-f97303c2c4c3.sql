-- Phase 2 cleanup: remove legacy CRM tables no longer used by the product
DROP TABLE IF EXISTS public.sales CASCADE;
DROP TABLE IF EXISTS public.tasks CASCADE;
DROP TABLE IF EXISTS public.prospects CASCADE;
DROP TYPE IF EXISTS public.prospect_statut CASCADE;
DROP TYPE IF EXISTS public.task_priorite CASCADE;
DROP TYPE IF EXISTS public.task_source CASCADE;