-- Restricted directory for authenticated active members. Keep phone numbers private.

create function public.is_active_ifc_member()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.chapter_memberships
    where user_id = (select auth.uid())
      and role in ('member', 'chapter_admin', 'ifc_admin')
      and status = 'active'
  );
$$;

create function public.can_read_pnm_profile_photo(object_name text)
returns boolean
language sql
stable
security definer
set search_path = public, storage
as $$
  select public.is_active_ifc_member()
    and exists (
      select 1
      from public.profiles profile
      join public.chapter_memberships membership on membership.user_id = profile.id
      where profile.photo_path = object_name
        and membership.role = 'pnm'
        and membership.status = 'active'
    );
$$;

revoke all on function public.is_active_ifc_member() from public;
revoke all on function public.can_read_pnm_profile_photo(text) from public;
grant execute on function public.is_active_ifc_member() to authenticated;
grant execute on function public.can_read_pnm_profile_photo(text) to authenticated;

create policy "Users can create their own PNM membership"
  on public.chapter_memberships for insert to authenticated
  with check (
    user_id = (select auth.uid())
    and chapter_id is null
    and role = 'pnm'
    and status = 'active'
  );

create policy "Users can maintain their own PNM membership"
  on public.chapter_memberships for update to authenticated
  using (
    user_id = (select auth.uid())
    and chapter_id is null
    and role = 'pnm'
  )
  with check (
    user_id = (select auth.uid())
    and chapter_id is null
    and role = 'pnm'
    and status = 'active'
  );

create policy "Active members can read PNM profile photos"
  on storage.objects for select to authenticated
  using (
    bucket_id = 'profile-photos'
    and public.can_read_pnm_profile_photo(name)
  );

create view public.pnm_directory as
  select profile.id,
    profile.full_name,
    profile.hometown,
    profile.major,
    profile.photo_path
  from public.profiles profile
  join public.chapter_memberships membership on membership.user_id = profile.id
  where membership.role = 'pnm'
    and membership.status = 'active'
    and public.is_active_ifc_member();

grant select on public.pnm_directory to authenticated;
