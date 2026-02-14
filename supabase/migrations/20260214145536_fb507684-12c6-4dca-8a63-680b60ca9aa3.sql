-- Enable realtime for key tables
ALTER PUBLICATION supabase_realtime ADD TABLE public.prospects;
ALTER PUBLICATION supabase_realtime ADD TABLE public.sales;
ALTER PUBLICATION supabase_realtime ADD TABLE public.tasks;