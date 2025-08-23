-- Database trigger to automatically generate responses when external reviews are added
-- This should be run in your Supabase SQL editor

-- Create function to automatically generate response for new external reviews
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
    
    -- Call the edge function to generate response (non-blocking)
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
          'tenant_slug', COALESCE(tenant_slug, 'eusbett')
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
      'review_response_triggered',
      jsonb_build_object(
        'external_review_id', NEW.id,
        'rating', NEW.review_rating,
        'platform', NEW.provider,
        'guest_name', NEW.author_name
      ),
      'info'
    );
    
  END IF;
  
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Log error but don't fail the review insertion
    INSERT INTO public.system_logs (
      tenant_id,
      event_type,
      event_category,
      event_name,
      event_data,
      severity,
      error_message
    ) VALUES (
      NEW.tenant_id,
      'system_event',
      'auto_response',
      'review_response_trigger_error',
      jsonb_build_object(
        'external_review_id', NEW.id,
        'error', SQLERRM
      ),
      'error',
      SQLERRM
    );
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger that fires after external review insertion
DROP TRIGGER IF EXISTS auto_generate_review_response_trigger ON public.external_reviews;
CREATE TRIGGER auto_generate_review_response_trigger
  AFTER INSERT ON public.external_reviews
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_generate_review_response();

-- Grant necessary permissions
GRANT EXECUTE ON FUNCTION public.auto_generate_review_response() TO authenticated, service_role;

-- Note: You'll need to set these configuration values in your Supabase project:
-- 1. Go to Settings > Database > Configuration
-- 2. Add these custom configurations:
--    - app.supabase_url = your_supabase_url (e.g., https://your-project.supabase.co)
--    - app.service_role_key = your_service_role_key

-- Alternative approach using pg_net extension (if the above doesn't work):
-- You can also use the pg_net extension for HTTP requests:
-- SELECT net.http_post(...) FROM your_table;
