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
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      <Card className="p-6 rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 shadow-sm hover:shadow-md transition-shadow">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3 p-0 mb-2">
          <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-400">Total Reviews</CardTitle>
          <MessageSquare className="h-4 w-4 text-gray-400" />
        </CardHeader>
        <CardContent className="p-0">
          <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">{((stats?.totalFeedback || 0) + (stats?.externalReviews || 0))}</div>
          <div className="flex items-center mt-2">
            <StarRating rating={stats?.averageRating || 0} size="sm" />
            <span className="ml-2 text-sm text-gray-500 dark:text-gray-400">
              {stats?.averageRating?.toFixed(1) || '0.0'} avg
            </span>
          </div>
        </CardContent>
      </Card>

      <Card className="p-6 rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 shadow-sm hover:shadow-md transition-shadow">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3 p-0 mb-2">
          <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-400">High Ratings</CardTitle>
          <TrendingUp className="h-4 w-4 text-green-500" />
        </CardHeader>
        <CardContent className="p-0">
          <div className="text-2xl font-bold text-green-600 dark:text-green-400">{(stats?.highRatings || 0)}</div>
          <p className="text-xs text-gray-500 dark:text-gray-400">5 star ratings</p>
        </CardContent>
      </Card>

      <Card className="p-6 rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 shadow-sm hover:shadow-md transition-shadow">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3 p-0 mb-2">
          <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-400">Issues Reported</CardTitle>
          <AlertTriangle className="h-4 w-4 text-orange-500" />
        </CardHeader>
        <CardContent className="p-0">
          <div className="text-2xl font-bold text-orange-600 dark:text-orange-400">{(stats?.lowRatings || 0)}</div>
          <p className="text-xs text-gray-500 dark:text-gray-400">1-4 star ratings</p>
        </CardContent>
      </Card>

      <Card className="p-6 rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 shadow-sm hover:shadow-md transition-shadow">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3 p-0 mb-2">
          <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-400">Guest Responses</CardTitle>
          <MessageSquare className="h-4 w-4 text-blue-500" />
        </CardHeader>
        <CardContent className="p-0">
          <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">{stats?.responseSent || 0}</div>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            {stats?.pendingResponse || 0} awaiting response
          </p>
        </CardContent>
      </Card>
    </div>
  )
}