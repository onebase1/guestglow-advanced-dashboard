import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { StarRating } from "@/components/ui/star-rating"

interface ExternalReview {
  id: string
  place_name: string
  provider: string
  review_rating: number
  review_preview: string | null
  author_name: string | null
  review_date: string
  sentiment: string
  response_required: boolean
}

interface ExternalReviewsTabProps {
  externalReviews: ExternalReview[]
}

export function ExternalReviewsTab({ externalReviews }: ExternalReviewsTabProps) {
  const getSentimentColor = (sentiment: string) => {
    switch (sentiment) {
      case 'positive': return 'success'
      case 'negative': return 'destructive'
      case 'neutral': return 'warning'
      default: return 'secondary'
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>External Reviews</CardTitle>
        <CardDescription>
          Reviews from Google, Trustpilot, and other platforms
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {externalReviews.map((review) => (
            <div key={review.id} className="flex flex-col space-y-3 p-4 border rounded-lg sm:flex-row sm:items-start sm:space-y-0 sm:space-x-4">
              <div className="flex-1 space-y-2">
                <div className="flex flex-col space-y-2 sm:flex-row sm:items-center sm:justify-between sm:space-y-0">
                  <div className="flex flex-col space-y-2 sm:flex-row sm:items-center sm:space-y-0 sm:space-x-2">
                    <span className="font-medium text-sm sm:text-base">{review.author_name || 'Anonymous'}</span>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-xs">{review.provider}</Badge>
                      <StarRating rating={review.review_rating} size="sm" />
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-1 sm:gap-2">
                    <Badge variant={getSentimentColor(review.sentiment) as any} className="text-xs">
                      {review.sentiment}
                    </Badge>
                    {review.response_required && (
                      <Badge variant="destructive" className="text-xs">Needs Response</Badge>
                    )}
                  </div>
                </div>
                <p className="text-sm text-muted-foreground line-clamp-3">{review.review_preview || 'No detailed review provided'}</p>
                <div className="flex flex-col gap-1 text-xs text-muted-foreground sm:flex-row sm:items-center sm:gap-2">
                  <span className="truncate">{review.place_name}</span>
                  <span className="hidden sm:inline">•</span>
                  <span>{new Date(review.review_date).toLocaleDateString()}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}