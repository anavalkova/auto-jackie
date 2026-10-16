create or replace function public.demo_workshop_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select workshop_id from public.workshop_invites
  where email = 'demo.workshop@autojackie.app'
  limit 1
$$;

grant execute on function public.demo_workshop_id() to authenticated;

create policy "anyone signed in can read the demo workshop"
on public.workshops for select to authenticated
using (id = public.demo_workshop_id());

create policy "anyone signed in can read demo settings"
on public.workshop_settings for select to authenticated
using (workshop_id = public.demo_workshop_id());

create policy "anyone signed in can read demo requests"
on public.inquiries for select to authenticated
using (workshop_id = public.demo_workshop_id());