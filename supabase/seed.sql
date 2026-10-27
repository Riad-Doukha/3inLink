-- Sample alerts from the design system's care assistant app demo. Safe to re-run.
-- reset_demo() returns nothing; the select below shows the six seeded rows.
select public.reset_demo();

select patient_code, room, command, created_at, handled_at
from public.alerts
order by created_at desc;
