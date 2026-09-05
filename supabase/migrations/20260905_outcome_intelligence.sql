-- NexJud Outcome Intelligence
alter table public.legal_case_outcomes add column if not exists result_score integer;
alter table public.legal_case_outcomes add column if not exists result_status text;
alter table public.legal_case_outcomes add column if not exists learned_lesson text;
alter table public.legal_case_outcomes add column if not exists source text default 'manual';

create index if not exists idx_case_outcomes_type on public.legal_case_outcomes(case_id, outcome_type, created_at desc);

create or replace view public.legal_case_outcome_metrics as
select
  user_id,
  case_id,
  count(*) as events_count,
  count(*) filter (where lawyer_decision is not null and lawyer_decision <> '') as decisions_count,
  count(*) filter (where action_taken is not null and action_taken <> '') as actions_count,
  count(*) filter (where outcome is not null and outcome <> '') as outcomes_count,
  avg(result_score) filter (where result_score is not null) as avg_result_score,
  max(created_at) as last_event_at
from public.legal_case_outcomes
group by user_id, case_id;

grant select on public.legal_case_outcome_metrics to authenticated;