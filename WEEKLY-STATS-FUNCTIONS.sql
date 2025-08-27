-- 📊 WEEKLY STATS FUNCTIONS FOR MANAGER PERFORMANCE REPORTING
-- Creates SQL functions to generate weekly statistics for the dashboard

-- Function 1: Get weekly escalation statistics
CREATE OR REPLACE FUNCTION public.get_weekly_escalation_stats(
    p_week_start DATE,
    p_weeks_back INTEGER DEFAULT 4
)
RETURNS TABLE (
    week_start_date DATE,
    total_escalations BIGINT,
    guest_relations_escalations BIGINT,
    gm_escalations BIGINT,
    auto_closures BIGINT,
    acknowledged_count BIGINT,
    resolved_count BIGINT,
    avg_response_time_minutes NUMERIC,
    acknowledgment_rate NUMERIC,
    resolution_rate NUMERIC,
    auto_closure_rate NUMERIC
) AS $$
BEGIN
    RETURN QUERY
    WITH weekly_data AS (
        SELECT 
            DATE_TRUNC('week', es.escalated_at)::DATE as week_start,
            COUNT(*) as total_escalations,
            COUNT(*) FILTER (WHERE es.manager_department = 'Guest Relations') as guest_relations_escalations,
            COUNT(*) FILTER (WHERE es.manager_department = 'Management') as gm_escalations,
            COUNT(*) FILTER (WHERE es.was_auto_closed = true) as auto_closures,
            COUNT(*) FILTER (WHERE es.was_acknowledged = true) as acknowledged_count,
            COUNT(*) FILTER (WHERE es.was_resolved = true) as resolved_count,
            AVG(es.response_time_minutes) FILTER (WHERE es.response_time_minutes IS NOT NULL) as avg_response_time
        FROM public.escalation_stats es
        WHERE es.escalated_at >= (p_week_start - INTERVAL '1 week' * p_weeks_back)
          AND es.escalated_at < (p_week_start + INTERVAL '1 week')
        GROUP BY DATE_TRUNC('week', es.escalated_at)::DATE
    )
    SELECT 
        wd.week_start,
        wd.total_escalations,
        wd.guest_relations_escalations,
        wd.gm_escalations,
        wd.auto_closures,
        wd.acknowledged_count,
        wd.resolved_count,
        COALESCE(wd.avg_response_time, 0)::NUMERIC,
        CASE 
            WHEN wd.total_escalations > 0 THEN (wd.acknowledged_count::NUMERIC / wd.total_escalations * 100)
            ELSE 0
        END as acknowledgment_rate,
        CASE 
            WHEN wd.total_escalations > 0 THEN (wd.resolved_count::NUMERIC / wd.total_escalations * 100)
            ELSE 0
        END as resolution_rate,
        CASE 
            WHEN wd.total_escalations > 0 THEN (wd.auto_closures::NUMERIC / wd.total_escalations * 100)
            ELSE 0
        END as auto_closure_rate
    FROM weekly_data wd
    ORDER BY wd.week_start DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function 2: Get manager performance statistics
CREATE OR REPLACE FUNCTION public.get_manager_performance_stats(
    p_week_start DATE
)
RETURNS TABLE (
    manager_email VARCHAR(255),
    manager_department VARCHAR(100),
    escalation_count BIGINT,
    acknowledged_count BIGINT,
    resolved_count BIGINT,
    auto_closed_count BIGINT,
    avg_response_time NUMERIC,
    acknowledgment_rate NUMERIC
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        es.manager_email,
        es.manager_department,
        COUNT(*) as escalation_count,
        COUNT(*) FILTER (WHERE es.was_acknowledged = true) as acknowledged_count,
        COUNT(*) FILTER (WHERE es.was_resolved = true) as resolved_count,
        COUNT(*) FILTER (WHERE es.was_auto_closed = true) as auto_closed_count,
        COALESCE(AVG(es.response_time_minutes) FILTER (WHERE es.response_time_minutes IS NOT NULL), 0)::NUMERIC as avg_response_time,
        CASE 
            WHEN COUNT(*) > 0 THEN (COUNT(*) FILTER (WHERE es.was_acknowledged = true)::NUMERIC / COUNT(*) * 100)
            ELSE 0
        END as acknowledgment_rate
    FROM public.escalation_stats es
    WHERE es.week_start_date = p_week_start
    GROUP BY es.manager_email, es.manager_department
    ORDER BY es.manager_department, es.manager_email;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function 3: Get detailed escalation history for a specific feedback
CREATE OR REPLACE FUNCTION public.get_feedback_escalation_history(
    p_feedback_id UUID
)
RETURNS TABLE (
    escalation_level INTEGER,
    manager_email VARCHAR(255),
    manager_department VARCHAR(100),
    escalated_at TIMESTAMP WITH TIME ZONE,
    acknowledged_at TIMESTAMP WITH TIME ZONE,
    resolved_at TIMESTAMP WITH TIME ZONE,
    auto_closed_at TIMESTAMP WITH TIME ZONE,
    response_time_minutes INTEGER,
    was_acknowledged BOOLEAN,
    was_resolved BOOLEAN,
    was_auto_closed BOOLEAN
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        es.escalation_level,
        es.manager_email,
        es.manager_department,
        es.escalated_at,
        es.acknowledged_at,
        es.resolved_at,
        es.auto_closed_at,
        es.response_time_minutes,
        es.was_acknowledged,
        es.was_resolved,
        es.was_auto_closed
    FROM public.escalation_stats es
    WHERE es.feedback_id = p_feedback_id
    ORDER BY es.escalation_level, es.escalated_at;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function 4: Get current week's unresolved escalations (for dashboard alerts)
CREATE OR REPLACE FUNCTION public.get_current_unresolved_escalations()
RETURNS TABLE (
    feedback_id UUID,
    guest_name VARCHAR(255),
    room_number VARCHAR(10),
    rating INTEGER,
    issue_category VARCHAR(100),
    escalation_level INTEGER,
    manager_email VARCHAR(255),
    manager_department VARCHAR(100),
    hours_since_escalated NUMERIC,
    is_overdue BOOLEAN
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        f.id as feedback_id,
        f.guest_name,
        f.room_number,
        f.rating,
        f.issue_category,
        es.escalation_level,
        es.manager_email,
        es.manager_department,
        EXTRACT(EPOCH FROM (NOW() - es.escalated_at)) / 3600 as hours_since_escalated,
        (es.escalated_at < NOW() - INTERVAL '1 hour') as is_overdue
    FROM public.escalation_stats es
    JOIN public.feedback f ON f.id = es.feedback_id
    WHERE es.week_start_date = DATE_TRUNC('week', CURRENT_DATE)::DATE
      AND es.was_resolved = false
      AND es.was_auto_closed = false
    ORDER BY es.escalated_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function 5: Generate weekly summary report (for email reports)
CREATE OR REPLACE FUNCTION public.generate_weekly_summary_report(
    p_week_start DATE
)
RETURNS TABLE (
    report_section VARCHAR(50),
    metric_name VARCHAR(100),
    metric_value TEXT,
    performance_indicator VARCHAR(20)
) AS $$
DECLARE
    v_total_escalations INTEGER;
    v_acknowledgment_rate NUMERIC;
    v_auto_closures INTEGER;
    v_avg_response_time NUMERIC;
BEGIN
    -- Get summary metrics
    SELECT 
        COUNT(*),
        CASE WHEN COUNT(*) > 0 THEN (COUNT(*) FILTER (WHERE was_acknowledged = true)::NUMERIC / COUNT(*) * 100) ELSE 0 END,
        COUNT(*) FILTER (WHERE was_auto_closed = true),
        COALESCE(AVG(response_time_minutes) FILTER (WHERE response_time_minutes IS NOT NULL), 0)
    INTO v_total_escalations, v_acknowledgment_rate, v_auto_closures, v_avg_response_time
    FROM public.escalation_stats
    WHERE week_start_date = p_week_start;

    -- Return formatted report
    RETURN QUERY VALUES
        ('OVERVIEW', 'Total Escalations', v_total_escalations::TEXT, 
         CASE WHEN v_total_escalations <= 5 THEN 'GOOD' WHEN v_total_escalations <= 15 THEN 'FAIR' ELSE 'POOR' END),
        ('OVERVIEW', 'Acknowledgment Rate', v_acknowledgment_rate::TEXT || '%', 
         CASE WHEN v_acknowledgment_rate >= 90 THEN 'EXCELLENT' WHEN v_acknowledgment_rate >= 70 THEN 'GOOD' ELSE 'POOR' END),
        ('OVERVIEW', 'Auto-Closures', v_auto_closures::TEXT, 
         CASE WHEN v_auto_closures = 0 THEN 'EXCELLENT' WHEN v_auto_closures <= 2 THEN 'FAIR' ELSE 'POOR' END),
        ('OVERVIEW', 'Avg Response Time', ROUND(v_avg_response_time)::TEXT || ' minutes', 
         CASE WHEN v_avg_response_time <= 30 THEN 'EXCELLENT' WHEN v_avg_response_time <= 60 THEN 'GOOD' ELSE 'POOR' END);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant permissions to authenticated users
GRANT EXECUTE ON FUNCTION public.get_weekly_escalation_stats(DATE, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_manager_performance_stats(DATE) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_feedback_escalation_history(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_current_unresolved_escalations() TO authenticated;
GRANT EXECUTE ON FUNCTION public.generate_weekly_summary_report(DATE) TO authenticated;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_escalation_stats_week_manager 
ON public.escalation_stats(week_start_date, manager_email, manager_department);

CREATE INDEX IF NOT EXISTS idx_escalation_stats_feedback_escalation 
ON public.escalation_stats(feedback_id, escalation_level, escalated_at);

-- Test the functions
SELECT '📊 Weekly Stats Functions Created Successfully!' as status;

-- Test with current week
SELECT 'Testing with current week...' as test;
SELECT * FROM public.get_weekly_escalation_stats(DATE_TRUNC('week', CURRENT_DATE)::DATE, 1) LIMIT 1;

SELECT '✅ All functions ready for weekly reporting!' as result;
