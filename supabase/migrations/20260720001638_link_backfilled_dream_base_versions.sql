-- Data-modifying CTEs use one snapshot, so link pre-Dream rows in a separate
-- statement after the backfill insert has committed.

update public.document_versions dream
set base_version_id = base.id
from public.document_versions base
where dream.source = 'dream'
  and dream.base_version_id is null
  and base.source = 'pre_dream'
  and base.loop_run_id = dream.loop_run_id;
