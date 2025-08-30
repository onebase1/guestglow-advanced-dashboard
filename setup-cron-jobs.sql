-- GuestGlow GM Reports - Automated Email Scheduling Setup
-- This SQL sets up cron jobs in Supabase to automatically trigger GM reports

-- Enable the pg_cron extension if not already enabled
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Remove any existing cron jobs for GM reports (cleanup)
SELECT cron.unschedule('gm-daily-briefing');
SELECT cron.unschedule('gm-weekly-report');
SELECT cron.unschedule('gm-urgent-alerts');
SELECT cron.unschedule('gm-scheduled-reports');

-- Create a single cron job that runs every minute to check for scheduled reports
-- This will call the scheduled-gm-reports function which handles all timing logic
SELECT cron.schedule(
  'gm-scheduled-reports',
  '* * * * *', -- Every minute
  $$
  SELECT net.http_post(
    url := 'https://wzfpltamwhkncxjvulik.supabase.co/functions/v1/scheduled-gm-reports',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || current_setting('app.service_role_key')
    ),
    body := jsonb_build_object(
      'trigger_source', 'cron_job',
      'timestamp', now()
    )
  );
  $$
);

-- Alternative: Set up individual cron jobs for each report type
-- Uncomment these if you prefer separate cron jobs for each report

/*
-- Daily Briefing - Every day at 8:00 AM
SELECT cron.schedule(
  'gm-daily-briefing',
  '0 8 * * *',
  $$
  SELECT net.http_post(
    url := 'https://wzfpltamwhkncxjvulik.supabase.co/functions/v1/send-gm-reports',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || current_setting('app.service_role_key')
    ),
    body := jsonb_build_object(
      'report_type', 'daily',
      'tenant_id', '27843a9a-b53f-482a-87ba-1a3e52f55dc1',
      'recipient_emails', '["g.basera@yahoo.com"]',
      'cc_emails', '["gizzy@guest-glow.com"]'
    )
  );
  $$
);

-- Weekly Report - Every Monday at 9:00 AM
SELECT cron.schedule(
  'gm-weekly-report',
  '0 9 * * 1',
  $$
  SELECT net.http_post(
    url := 'https://wzfpltamwhkncxjvulik.supabase.co/functions/v1/send-gm-reports',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || current_setting('app.service_role_key')
    ),
    body := jsonb_build_object(
      'report_type', 'weekly',
      'tenant_id', '27843a9a-b53f-482a-87ba-1a3e52f55dc1',
      'recipient_emails', '["g.basera@yahoo.com"]',
      'cc_emails', '["gizzy@guest-glow.com"]'
    )
  );
  $$
);

-- Urgent Alerts - Every 15 minutes during business hours (7 AM - 11 PM)
SELECT cron.schedule(
  'gm-urgent-alerts',
  '*/15 7-23 * * *',
  $$
  SELECT net.http_post(
    url := 'https://wzfpltamwhkncxjvulik.supabase.co/functions/v1/scheduled-gm-reports',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || current_setting('app.service_role_key')
    ),
    body := jsonb_build_object(
      'check_urgent_only', true,
      'tenant_id', '27843a9a-b53f-482a-87ba-1a3e52f55dc1'
    )
  );
  $$
);
*/

-- Create email_schedules table if it doesn't exist
CREATE TABLE IF NOT EXISTS email_schedules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  schedule_type TEXT NOT NULL CHECK (schedule_type IN ('daily', 'weekly', 'monthly', 'urgent')),
  recipients TEXT[] NOT NULL,
  cron_expression TEXT NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  next_run TIMESTAMP WITH TIME ZONE,
  last_run TIMESTAMP WITH TIME ZONE,
  run_count INTEGER DEFAULT 0
);

-- Insert default schedules for Eusbett Hotel
INSERT INTO email_schedules (tenant_id, schedule_type, recipients, cron_expression, next_run) VALUES
  ('27843a9a-b53f-482a-87ba-1a3e52f55dc1', 'daily', '{"g.basera@yahoo.com"}', '0 8 * * *', 
   (CURRENT_DATE + INTERVAL '1 day' + TIME '08:00:00')::timestamp with time zone),
  ('27843a9a-b53f-482a-87ba-1a3e52f55dc1', 'weekly', '{"g.basera@yahoo.com"}', '0 9 * * 1', 
   (CURRENT_DATE + INTERVAL '1 week' - INTERVAL '1 day' * EXTRACT(DOW FROM CURRENT_DATE) + INTERVAL '1 day' + TIME '09:00:00')::timestamp with time zone),
  ('27843a9a-b53f-482a-87ba-1a3e52f55dc1', 'urgent', '{"g.basera@yahoo.com"}', '*/15 7-23 * * *', 
   (CURRENT_TIMESTAMP + INTERVAL '15 minutes')::timestamp with time zone)
ON CONFLICT DO NOTHING;

-- Verify cron jobs are created
SELECT jobname, schedule, command FROM cron.job WHERE jobname LIKE 'gm-%';

-- Show scheduled emails
SELECT * FROM email_schedules WHERE tenant_id = '27843a9a-b53f-482a-87ba-1a3e52f55dc1';

-- Grant necessary permissions
GRANT USAGE ON SCHEMA cron TO postgres;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA cron TO postgres;

-- Create a function to manually trigger reports (for testing)
CREATE OR REPLACE FUNCTION trigger_gm_report(report_type TEXT DEFAULT 'daily')
RETURNS TEXT AS $$
DECLARE
  result TEXT;
BEGIN
  SELECT net.http_post(
    url := 'https://wzfpltamwhkncxjvulik.supabase.co/functions/v1/send-gm-reports',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || current_setting('app.service_role_key')
    ),
    body := jsonb_build_object(
      'report_type', report_type,
      'tenant_id', '27843a9a-b53f-482a-87ba-1a3e52f55dc1',
      'recipient_emails', '["g.basera@yahoo.com"]',
      'cc_emails', '["gizzy@guest-glow.com"]'
    )
  ) INTO result;
  
  RETURN 'GM ' || report_type || ' report triggered: ' || result;
END;
$$ LANGUAGE plpgsql;

-- Test the function (uncomment to test)
-- SELECT trigger_gm_report('daily');

COMMENT ON TABLE email_schedules IS 'Stores email scheduling configuration for automated GM reports';
COMMENT ON FUNCTION trigger_gm_report IS 'Manually trigger GM reports for testing purposes';
