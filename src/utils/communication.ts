import { supabase } from '@/integrations/supabase/client'

export interface CommunicationSummary {
  count: number
  lastSubject?: string | null
  lastCreatedAt?: string | null
}

export async function getCommunicationSummary(feedbackId: string): Promise<CommunicationSummary> {
  const { data, count, error } = await supabase
    .from('communication_logs')
    .select('id,email_subject,created_at', { count: 'exact' })
    .eq('feedback_id', feedbackId)
    .order('created_at', { ascending: false })
    .limit(1)

  if (error) {
    return { count: 0 }
  }

  const last = data && data.length > 0 ? data[0] : null
  return {
    count: count ?? (data?.length || 0),
    lastSubject: last?.email_subject ?? null,
    lastCreatedAt: last?.created_at ?? null,
  }
}

