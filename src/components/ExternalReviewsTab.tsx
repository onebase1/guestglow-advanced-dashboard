import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { useMemo, useState } from "react"

import { Badge } from "@/components/ui/badge"
import { StarRating } from "@/components/ui/star-rating"
import { Globe, Compass, Calendar, ThumbsUp, ShieldCheck, ExternalLink } from "lucide-react"


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
  review_url?: string
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

  const [providerFilter, setProviderFilter] = useState<string>('all')
  const [ratingFilter, setRatingFilter] = useState<number>(0)
  const [needsResponseOnly, setNeedsResponseOnly] = useState<boolean>(false)

  const providerColors: Record<string, string> = {
    google: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
    tripadvisor: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
    booking: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-300',
    facebook: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
    trustpilot: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300',
  }

  const filtered = useMemo(() => {
    return externalReviews.filter(r => {
      const byProvider = providerFilter === 'all' || r.provider === providerFilter
      const byRating = r.review_rating >= ratingFilter
      const byResponse = !needsResponseOnly || r.response_required
      return byProvider && byRating && byResponse
    })
  }, [externalReviews, providerFilter, ratingFilter, needsResponseOnly])

  const ProviderIcon = ({ name, className = "h-3.5 w-3.5" }: { name: string; className?: string }) => {
    switch (name) {
      case 'tripadvisor':
        return <Compass className={className} />
      case 'booking':
        return <ShieldCheck className={className} />
      case 'facebook':
        return <ThumbsUp className={className} />
      case 'trustpilot':
        return <ShieldCheck className={className} />
      case 'google':
      default:
        return <Globe className={className} />
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>External Reviews</CardTitle>
        <CardDescription>
          Reviews from Google, Trustpilot, and other platforms
        </CardDescription>
        {/* Filters */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between p-3 border rounded-lg bg-muted/30">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs text-muted-foreground">Provider:</span>
            {['all','google','tripadvisor','booking','facebook','trustpilot'].map(p => (
              <button
                key={p}
                onClick={() => setProviderFilter(p)}
                className={`px-2 py-1 rounded-full text-xs capitalize border ${providerFilter===p ? 'bg-primary text-primary-foreground' : 'bg-background text-foreground'}`}
              >{p}</button>
            ))}
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">Min rating:</span>
              <select
                className="h-8 rounded-md border bg-background px-2 text-xs"
                value={ratingFilter}
                onChange={(e) => setRatingFilter(parseInt(e.target.value))}
              >
                {[0,1,2,3,4,5].map(r => <option key={r} value={r}>{r}+</option>)}
              </select>
            </div>
            <label className="flex items-center gap-2 text-xs">
              <input type="checkbox" checked={needsResponseOnly} onChange={(e)=>setNeedsResponseOnly(e.target.checked)} />
              Needs response
            </label>
          </div>
        </div>

        {/* Results */}
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {filtered.map((review) => (
            <div key={review.id} className="flex flex-col space-y-3 p-4 border rounded-lg sm:flex-row sm:items-start sm:space-y-0 sm:space-x-4">
              <div className="flex-1 space-y-2">
                <div className="flex flex-col space-y-2 sm:flex-row sm:items-center sm:justify-between sm:space-y-0">
                  <div className="flex flex-col space-y-2 sm:flex-row sm:items-center sm:space-y-0 sm:space-x-2">
                    <span className="font-medium text-sm sm:text-base">{review.author_name || 'Anonymous'}</span>
                    <div className="flex items-center gap-2">
                      <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs capitalize border ${providerColors[review.provider] || 'bg-muted text-foreground'}`}>
                        <ProviderIcon name={review.provider} className="h-3.5 w-3.5" /> {review.provider}
                      </span>
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
                  <span className="inline-flex items-center gap-1"><Calendar className="h-3 w-3" />{new Date(review.review_date).toLocaleDateString()}</span>
                  {review.review_url && (
                    <a href={review.review_url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-primary hover:underline">
                      <ExternalLink className="h-3 w-3" /> View
                    </a>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}