-- Milestone 4: upload write policies for batches/assets (PRD.md Section 6.2-6.3, 14 #4).
-- Deferred from 0002 until the feature that needs them (per that migration's comment).

create policy "batches insertable by their creator"
  on public.batches for insert
  to authenticated
  with check (created_by = auth.uid());

create policy "assets insertable by their uploader"
  on public.assets for insert
  to authenticated
  with check (uploaded_by = auth.uid());
