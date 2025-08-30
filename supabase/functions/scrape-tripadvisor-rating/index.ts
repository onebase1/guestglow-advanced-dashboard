import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface ScrapeRequest {
  tenant_id: string
  hotel_name?: string
  tripadvisor_url?: string
}

interface TripAdvisorData {
  rating: number
  total_reviews: number
  rating_breakdown: {
    excellent: number
    good: number
    average: number
    poor: number
    terrible: number
  }
  category_scores?: {
    rooms: number
    service: number
    value: number
    cleanliness: number
    location: number
    sleep_quality: number
  }
  recent_reviews: Array<{
    rating: number
    title: string
    text: string
    date: string
    reviewer: string
  }>
  scraped_at: string
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

    const { tenant_id, hotel_name, tripadvisor_url }: ScrapeRequest = await req.json()
    
    console.log('🔍 Scraping TripAdvisor for tenant:', tenant_id)

    // Default to Eusbett Hotel if no URL provided
    const targetUrl = tripadvisor_url || 'https://www.tripadvisor.com/Hotel_Review-g2400444-d2399149-Reviews-Eusbett_Hotel-Sunyani_Brong_Ahafo_Region.html'
    
    console.log('📍 Target URL:', targetUrl)

    // Use Firecrawl to scrape TripAdvisor page
    const scrapedData = await scrapeWithFirecrawl(targetUrl)
    
    if (!scrapedData) {
      throw new Error('Failed to scrape TripAdvisor data')
    }

    // Store the scraped data
    await storeTripAdvisorData(supabase, tenant_id, scrapedData)

    // Update daily rating progress
    await updateDailyProgress(supabase, tenant_id, scrapedData)

    return new Response(
      JSON.stringify({
        success: true,
        data: scrapedData,
        message: 'TripAdvisor data scraped and stored successfully'
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    )

  } catch (error) {
    console.error('❌ Error scraping TripAdvisor:', error)
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    )
  }
})

async function scrapeWithFirecrawl(url: string): Promise<TripAdvisorData | null> {
  try {
    const firecrawlApiKey = Deno.env.get('FIRECRAWL_API_KEY')
    if (!firecrawlApiKey) {
      throw new Error('FIRECRAWL_API_KEY environment variable not configured')
    }

    console.log('🔥 Using Firecrawl to scrape TripAdvisor...')

    const response = await fetch('https://api.firecrawl.dev/v1/scrape', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${firecrawlApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        url: url,
        formats: ['extract'],
        extract: {
          schema: {
            type: 'object',
            properties: {
              rating: {
                type: 'number',
                description: 'Overall hotel rating (e.g., 4.0)'
              },
              total_reviews: {
                type: 'number',
                description: 'Total number of reviews'
              },
              rating_breakdown: {
                type: 'object',
                description: 'Rating distribution breakdown',
                properties: {
                  excellent: { type: 'number', description: 'Number of 5-star reviews' },
                  good: { type: 'number', description: 'Number of 4-star reviews' },
                  average: { type: 'number', description: 'Number of 3-star reviews' },
                  poor: { type: 'number', description: 'Number of 2-star reviews' },
                  terrible: { type: 'number', description: 'Number of 1-star reviews' }
                }
              },
              category_scores: {
                type: 'object',
                description: 'Category-specific ratings (Rooms, Service, Value, etc.)',
                properties: {
                  rooms: { type: 'number', description: 'Rooms rating out of 5' },
                  service: { type: 'number', description: 'Service rating out of 5' },
                  value: { type: 'number', description: 'Value rating out of 5' },
                  cleanliness: { type: 'number', description: 'Cleanliness rating out of 5' },
                  location: { type: 'number', description: 'Location rating out of 5' },
                  sleep_quality: { type: 'number', description: 'Sleep Quality rating out of 5' }
                }
              },
              recent_reviews: {
                type: 'array',
                description: 'Most recent reviews with details',
                items: {
                  type: 'object',
                  properties: {
                    rating: { type: 'number', description: 'Review rating 1-5' },
                    title: { type: 'string', description: 'Review title' },
                    text: { type: 'string', description: 'Review content' },
                    date: { type: 'string', description: 'Review date' },
                    reviewer: { type: 'string', description: 'Reviewer name' }
                  }
                }
              }
            }
          }
        },
        onlyMainContent: true,
        waitFor: 3000
      })
    })

    if (!response.ok) {
      throw new Error(`Firecrawl API error: ${response.status}`)
    }

    const result = await response.json()
    
    if (!result.success) {
      throw new Error(`Firecrawl scraping failed: ${result.error}`)
    }

    const extractedData = result.data?.extract
    
    if (!extractedData) {
      throw new Error('No data extracted from TripAdvisor page')
    }

    console.log('✅ Successfully scraped TripAdvisor data:', extractedData)

    return {
      ...extractedData,
      scraped_at: new Date().toISOString()
    }

  } catch (error) {
    console.error('❌ Firecrawl scraping error:', error)
    return null
  }
}

async function storeTripAdvisorData(supabase: any, tenantId: string, data: TripAdvisorData) {
  console.log('💾 Storing TripAdvisor data...')

  // Store in tripadvisor_scrapes table
  const { error } = await supabase
    .from('tripadvisor_scrapes')
    .insert({
      tenant_id: tenantId,
      rating: data.rating,
      total_reviews: data.total_reviews,
      rating_breakdown: data.rating_breakdown,
      category_scores: data.category_scores,
      recent_reviews: data.recent_reviews,
      scraped_at: data.scraped_at,
      created_at: new Date().toISOString()
    })

  if (error) {
    console.error('❌ Error storing TripAdvisor data:', error)
    throw error
  }

  console.log('✅ TripAdvisor data stored successfully')
}

async function updateDailyProgress(supabase: any, tenantId: string, data: TripAdvisorData) {
  console.log('📊 Updating daily rating progress...')

  const today = new Date().toISOString().split('T')[0]

  // Update or insert today's progress
  const { error } = await supabase
    .from('daily_rating_progress')
    .upsert({
      tenant_id: tenantId,
      progress_date: today,
      overall_rating: data.rating, // Use TripAdvisor rating as overall rating
      tripadvisor_rating: data.rating,
      total_reviews: data.total_reviews,
      five_star_count: data.rating_breakdown?.excellent || 0,
      four_star_count: data.rating_breakdown?.good || 0,
      three_star_count: data.rating_breakdown?.average || 0,
      two_star_count: data.rating_breakdown?.poor || 0,
      one_star_count: data.rating_breakdown?.terrible || 0,
      updated_at: new Date().toISOString()
    })

  if (error) {
    console.error('❌ Error updating daily progress:', error)
    throw error
  }

  console.log('✅ Daily progress updated successfully')
}
