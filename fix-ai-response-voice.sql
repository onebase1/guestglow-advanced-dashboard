-- Fix AI Response Voice Issue
-- This updates the database trigger to use the improved AI system with team voice ("we")
-- Run this in your Supabase SQL editor

-- Drop the existing trigger
DROP TRIGGER IF EXISTS auto_generate_review_response_trigger ON public.external_reviews;

-- Update the function to use the improved AI system
CREATE OR REPLACE FUNCTION public.auto_generate_review_response()
RETURNS TRIGGER AS $$
DECLARE
  tenant_slug TEXT;
BEGIN
  -- Only generate responses for reviews that need them (rating <= 3 or response_required = true)
  IF NEW.review_rating <= 3 OR NEW.response_required = true THEN
    
    -- Get tenant slug for the review
    SELECT slug INTO tenant_slug 
    FROM public.tenants 
    WHERE id = NEW.tenant_id;
    
    -- Call the IMPROVED edge function (uses team voice "we")
    PERFORM
      net.http_post(
        url := current_setting('app.supabase_url') || '/functions/v1/generate-external-review-response-improved',
        headers := jsonb_build_object(
          'Content-Type', 'application/json',
          'Authorization', 'Bearer ' || current_setting('app.service_role_key')
        ),
        body := jsonb_build_object(
          'external_review_id', NEW.id,
          'platform', NEW.provider,
          'guest_name', COALESCE(NEW.author_name, 'Anonymous'),
          'rating', NEW.review_rating,
          'review_text', NEW.review_text,
          'review_date', NEW.review_date,
          'sentiment', COALESCE(NEW.sentiment, 'neutral'),
          'tenant_id', NEW.tenant_id,
          'regenerate', false
        )
      );
      
    -- Log the trigger execution
    INSERT INTO public.system_logs (
      tenant_id,
      event_type,
      event_category,
      event_name,
      event_data,
      severity
    ) VALUES (
      NEW.tenant_id,
      'system_event',
      'auto_response',
      'improved_review_response_triggered',
      jsonb_build_object(
        'external_review_id', NEW.id,
        'rating', NEW.review_rating,
        'platform', NEW.provider,
        'guest_name', NEW.author_name,
        'ai_system', 'improved_team_voice'
      ),
      'info'
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Recreate the trigger with the updated function
CREATE TRIGGER auto_generate_review_response_trigger
  AFTER INSERT ON public.external_reviews
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_generate_review_response();

-- Optional: Clean up old responses with first-person voice
-- (Uncomment if you want to mark old responses for regeneration)
/*
UPDATE public.review_responses 
SET status = 'needs_regeneration',
    response_text = response_text || '\n\n[SYSTEM NOTE: This response uses old AI system and should be regenerated with improved team voice]'
WHERE ai_model_used = 'gpt-4.1-2025-04-14' 
  AND response_text ILIKE '%I %'
  AND status = 'draft';
*/

-- Add a comment to track the fix
COMMENT ON FUNCTION public.auto_generate_review_response() IS 'Updated 2025-01-22: Now uses improved AI system with team voice (we) instead of first-person (I)';

-- Verify the trigger is working
SELECT 
  trigger_name,
  event_manipulation,
  action_statement,
  action_timing
FROM information_schema.triggers 
WHERE trigger_name = 'auto_generate_review_response_trigger';
