alter table public.email_outbox drop constraint email_outbox_template_check;
alter table public.email_outbox add constraint email_outbox_template_check check (template = any (array['application_received','application_more_info','application_approved','application_rejected','recommendation_approved','team_new_application','member_invite','team_new_enquiry','business_lead']));
