-- Meeting access is restricted to the signed-in user whose own profile is an
-- admin. This function deliberately uses auth.uid(), never page state, URL
-- parameters, or an anonymous role.
create or replace function public.is_current_user_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles
    where id = auth.uid()
      and role = 'admin'
  );
$$;

revoke all on function public.is_current_user_admin() from public;
grant execute on function public.is_current_user_admin() to authenticated;

alter table public.meetings enable row level security;
alter table public.meeting_attendance enable row level security;

create policy "Authenticated admins can manage meetings"
on public.meetings
for all
to authenticated
using (public.is_current_user_admin())
with check (public.is_current_user_admin());

create policy "Authenticated admins can manage meeting attendance"
on public.meeting_attendance
for all
to authenticated
using (public.is_current_user_admin())
with check (public.is_current_user_admin());
