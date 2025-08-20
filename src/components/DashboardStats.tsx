import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { StarRating } from "@/components/ui/star-rating"
import { 
  TrendingUp, 
  MessageSquare, 
  AlertTriangle,
  Star
} from "lucide-react"

interface DashboardStatsProps {
  stats: {
    totalFeedback: number
    averageRating: number
    highRatings: number
    lowRatings: number
    resolvedCount: number
    externalReviews: number
    averageExternalRating: number
    reviewsNeedingResponse: number
    responseSent: number
    pendingResponse: number
  } | null
}

export function DashboardStats({ stats }: DashboardStatsProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total Reviews</CardTitle>
          <MessageSquare className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{((stats?.totalFeedback || 0) + (stats?.externalReviews || 0))}</div>
          <div className="flex items-center mt-1">
            <StarRating rating={stats?.averageRating || 0} size="sm" />
            <span className="ml-2 text-sm text-muted-foreground">
              {stats?.averageRating?.toFixed(1) || '0.0'} avg
            </span>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">High Ratings</CardTitle>
          <TrendingUp className="h-4 w-4 text-success" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-success">{(stats?.highRatings || 0)}</div>
          <p className="text-xs text-muted-foreground">4-5 star ratings</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Issues to Address</CardTitle>
          <AlertTriangle className="h-4 w-4 text-warning" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-warning">{(stats?.lowRatings || 0)}</div>
          <p className="text-xs text-muted-foreground">1-4 star ratings</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Guest Responses</CardTitle>
          <MessageSquare className="h-4 w-4 text-primary" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-primary">{stats?.responseSent || 0}</div>
          <p className="text-xs text-muted-foreground">
            {stats?.pendingResponse || 0} awaiting response
          </p>
        </CardContent>
      </Card>
    </div>
  )
}