import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

interface SecurityAuditLog {
  action: string;
  resource?: string;
  details?: Record<string, any>;
  success?: boolean;
}

export const useSecurityAuditLogger = () => {
  const { user } = useAuth();

  const logSecurityEvent = async (logData: SecurityAuditLog) => {
    try {
      // Get client info
      const userAgent = navigator.userAgent;
      
      // Get approximate IP (this would be more accurate server-side)
      let clientIP = 'unknown';
      try {
        const response = await fetch('https://api.ipify.org?format=json');
        const data = await response.json();
        clientIP = data.ip;
      } catch {
        // Fail silently if IP detection fails
      }

      await supabase.from('security_audit_logs').insert({
        user_id: user?.id || null,
        action: logData.action,
        resource: logData.resource || null,
        ip_address: clientIP,
        user_agent: userAgent,
        success: logData.success ?? true,
        details: logData.details || {}
      });
    } catch (error) {
      // Log security audit errors to console but don't throw
      console.error('Failed to log security event:', error);
    }
  };

  // Auto-log authentication events
  useEffect(() => {
    if (user) {
      logSecurityEvent({
        action: 'user_session_active',
        resource: 'authentication',
        details: { user_id: user.id }
      });
    }
  }, [user]);

  return { logSecurityEvent };
};