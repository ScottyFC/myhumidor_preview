-- Phase 58 — enable realtime for humidor_entries so collection changes
-- (add/remove/move) sync live across tabs and devices. Idempotent.
do $$
begin
  alter publication supabase_realtime add table public.humidor_entries;
exception when duplicate_object then null;
end $$;
