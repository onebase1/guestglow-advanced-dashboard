import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface RateLimitResult {
  allowed: boolean;
  remaining?: number;
  message?: string;
  resetTime?: Date;
}

export const useRateLimit = () => {
  const [isChecking, setIsChecking] = useState(false);

  const checkRateLimit = useCallback(async (
    endpoint: string,
    maxRequests = 10,
    windowMinutes = 15
  ): Promise<RateLimitResult> => {
    setIsChecking(true);
    
    try {
      // Get client IP (approximate, since we're in browser)
      const response = await fetch('https://api.ipify.org?format=json');
      const { ip } = await response.json();

      const { data, error } = await supabase.functions.invoke('rate-limiter', {
        body: {
          ip,
          endpoint,
          maxRequests,
          windowMinutes
        }
      });

      if (error) {
        console.error('Rate limit check error:', error);
        return { allowed: true }; // Fail open for better UX
      }

      return data;
    } catch (error) {
      console.error('Rate limit check failed:', error);
      return { allowed: true }; // Fail open for better UX
    } finally {
      setIsChecking(false);
    }
  }, []);

  return {
    checkRateLimit,
    isChecking
  };
};