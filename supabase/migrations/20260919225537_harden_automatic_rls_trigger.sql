-- The automatic-RLS event trigger should not be callable through the Data API.
revoke execute on function public.rls_auto_enable()
  from public, anon, authenticated, service_role;
