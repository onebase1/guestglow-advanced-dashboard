import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface PlatformConfig {
  platform: string
  api_key?: string
  place_id?: string
  hotel_id?: string
  rate_limit_per_hour: number
  enabled: boolean
}

interface ConfigRequest {
  tenant_id: string
  platform_configs: PlatformConfig[]
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const { tenant_id, platform_configs }: ConfigRequest = await req.json()
    
    console.log('🔧 Configuring platform API integrations for tenant:', tenant_id)

    // Store platform configurations
    const configResults = []
    
    for (const config of platform_configs) {
      try {
        // Validate API credentials
        const validationResult = await validatePlatformCredentials(config)
        
        // Store configuration in database
        const { error } = await supabase
          .from('platform_integrations')
          .upsert({
            tenant_id,
            platform: config.platform,
            api_key_encrypted: config.api_key ? await encryptApiKey(config.api_key) : null,
            place_id: config.place_id,
            hotel_id: config.hotel_id,
            rate_limit_per_hour: config.rate_limit_per_hour,
            enabled: config.enabled && validationResult.valid,
            last_validated: new Date().toISOString(),
            validation_status: validationResult.valid ? 'valid' : 'invalid',
            validation_message: validationResult.message
          })

        if (error) throw error

        configResults.push({
          platform: config.platform,
          success: true,
          valid: validationResult.valid,
          message: validationResult.message
        })

      } catch (error) {
        configResults.push({
          platform: config.platform,
          success: false,
          error: error.message
        })
      }
    }

    // Set up default configurations for Eusbett Hotel
    await setupEusbettDefaults(supabase, tenant_id)

    return new Response(
      JSON.stringify({ 
        success: true, 
        configurations: configResults,
        default_setup_complete: true
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    )

  } catch (error) {
    console.error('❌ Platform API configuration error:', error)
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    )
  }
})

async function validatePlatformCredentials(config: PlatformConfig): Promise<{ valid: boolean; message: string }> {
  console.log(`🔍 Validating ${config.platform} credentials...`)
  
  switch (config.platform) {
    case 'google':
      return await validateGoogleCredentials(config)
    case 'booking.com':
      return await validateBookingCredentials(config)
    case 'tripadvisor':
      return await validateTripAdvisorCredentials(config)
    default:
      return { valid: false, message: 'Unsupported platform' }
  }
}

async function validateGoogleCredentials(config: PlatformConfig): Promise<{ valid: boolean; message: string }> {
  if (!config.api_key || !config.place_id) {
    return { valid: false, message: 'Missing API key or Place ID' }
  }

  try {
    // Test Google My Business API connection
    const response = await fetch(
      `https://mybusinessbusinessinformation.googleapis.com/v1/locations/${config.place_id}?key=${config.api_key}`,
      {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${config.api_key}`,
          'Content-Type': 'application/json'
        }
      }
    )

    if (response.ok) {
      return { valid: true, message: 'Google My Business API connection successful' }
    } else {
      return { valid: false, message: `Google API error: ${response.status}` }
    }
  } catch (error) {
    return { valid: false, message: `Google API validation failed: ${error.message}` }
  }
}

async function validateBookingCredentials(config: PlatformConfig): Promise<{ valid: boolean; message: string }> {
  if (!config.api_key || !config.hotel_id) {
    return { valid: false, message: 'Missing API key or Hotel ID' }
  }

  try {
    // Test Booking.com Partner API connection
    const response = await fetch(
      `https://distribution-xml.booking.com/json/bookings.getHotelAvailability?hotel_ids=${config.hotel_id}`,
      {
        method: 'GET',
        headers: {
          'Authorization': `Basic ${btoa(config.api_key)}`,
          'Content-Type': 'application/json'
        }
      }
    )

    if (response.ok) {
      return { valid: true, message: 'Booking.com Partner API connection successful' }
    } else {
      return { valid: false, message: `Booking.com API error: ${response.status}` }
    }
  } catch (error) {
    return { valid: false, message: `Booking.com API validation failed: ${error.message}` }
  }
}

async function validateTripAdvisorCredentials(config: PlatformConfig): Promise<{ valid: boolean; message: string }> {
  if (!config.api_key || !config.hotel_id) {
    return { valid: false, message: 'Missing API key or Hotel ID' }
  }

  try {
    // Test TripAdvisor Content API connection
    const response = await fetch(
      `https://api.content.tripadvisor.com/api/v1/location/${config.hotel_id}`,
      {
        method: 'GET',
        headers: {
          'X-TripAdvisor-API-Key': config.api_key,
          'Accept': 'application/json'
        }
      }
    )

    if (response.ok) {
      return { valid: true, message: 'TripAdvisor Content API connection successful' }
    } else {
      return { valid: false, message: `TripAdvisor API error: ${response.status}` }
    }
  } catch (error) {
    return { valid: false, message: `TripAdvisor API validation failed: ${error.message}` }
  }
}

async function encryptApiKey(apiKey: string): Promise<string> {
  // In production, this would use proper encryption
  // For now, we'll use base64 encoding as a placeholder
  return btoa(apiKey)
}

async function setupEusbettDefaults(supabase: any, tenantId: string) {
  console.log('🏨 Setting up Eusbett Hotel default configurations...')
  
  // Create platform integrations table if it doesn't exist
  await supabase.rpc('create_platform_integrations_table_if_not_exists')

  // Set up default rating goal for Eusbett (4.0 → 4.5 stars)
  const sixMonthsFromNow = new Date()
  sixMonthsFromNow.setMonth(sixMonthsFromNow.getMonth() + 6)

  await supabase
    .from('rating_goals')
    .upsert({
      tenant_id: tenantId,
      goal_type: 'overall',
      current_rating: 4.0,
      target_rating: 4.5,
      target_date: sixMonthsFromNow.toISOString().split('T')[0],
      reviews_needed: 417, // 139 current + 278 needed
      five_star_reviews_needed: 278,
      daily_target: 1.55
    })

  // Set up default platform configurations (disabled until credentials provided)
  const defaultPlatforms = [
    {
      tenant_id: tenantId,
      platform: 'google',
      enabled: false,
      rate_limit_per_hour: 100,
      validation_status: 'pending_credentials',
      validation_message: 'Awaiting Google My Business API credentials'
    },
    {
      tenant_id: tenantId,
      platform: 'booking.com',
      enabled: false,
      rate_limit_per_hour: 50,
      validation_status: 'pending_credentials',
      validation_message: 'Awaiting Booking.com Partner API credentials'
    },
    {
      tenant_id: tenantId,
      platform: 'tripadvisor',
      enabled: false,
      rate_limit_per_hour: 25,
      validation_status: 'pending_credentials',
      validation_message: 'Awaiting TripAdvisor Content API credentials'
    }
  ]

  for (const platform of defaultPlatforms) {
    await supabase
      .from('platform_integrations')
      .upsert(platform)
  }

  console.log('✅ Eusbett default configurations set up successfully')
}

// Create the platform_integrations table via SQL function
const createTableSQL = `
CREATE OR REPLACE FUNCTION create_platform_integrations_table_if_not_exists()
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  CREATE TABLE IF NOT EXISTS platform_integrations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id),
    platform VARCHAR(50) NOT NULL,
    api_key_encrypted TEXT,
    place_id VARCHAR(255),
    hotel_id VARCHAR(255),
    rate_limit_per_hour INTEGER DEFAULT 100,
    enabled BOOLEAN DEFAULT false,
    last_sync TIMESTAMP WITH TIME ZONE,
    last_validated TIMESTAMP WITH TIME ZONE,
    validation_status VARCHAR(20) DEFAULT 'pending',
    validation_message TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(tenant_id, platform),
    CONSTRAINT valid_platform CHECK (platform IN ('google', 'booking.com', 'tripadvisor', 'expedia', 'hotels.com')),
    CONSTRAINT valid_validation_status CHECK (validation_status IN ('pending', 'valid', 'invalid', 'pending_credentials'))
  );

  -- Create indexes
  CREATE INDEX IF NOT EXISTS idx_platform_integrations_tenant_platform ON platform_integrations(tenant_id, platform);
  CREATE INDEX IF NOT EXISTS idx_platform_integrations_enabled ON platform_integrations(enabled);

  -- Enable RLS
  ALTER TABLE platform_integrations ENABLE ROW LEVEL SECURITY;

  -- Create RLS policy
  DROP POLICY IF EXISTS platform_integrations_tenant_access ON platform_integrations;
  CREATE POLICY platform_integrations_tenant_access ON platform_integrations 
    FOR ALL TO authenticated 
    USING (tenant_id IN (
      SELECT tenant_id FROM user_roles WHERE user_id = auth.uid()
    ));
END;
$$;
`
