import { RecentFeedbackTab } from "./RecentFeedbackTab"
import { ExternalReviewsTab } from "./ExternalReviewsTab"
import { WorkflowManager } from "./WorkflowManager"
import { AnalyticsCharts } from "./AnalyticsCharts"
import { QRCodeGenerator } from "./QRCodeGenerator"
import { AIInsights } from "./AIInsights"
import { ResponseManagementTab } from "./ResponseManagementTab"
import ExternalReviewResponseManager from "./ExternalReviewResponseManager"
import WhatsAppInbox from "./WhatsAppInbox"

interface DashboardContentProps {
  activeTab: string
  recentFeedback: any[]
  externalReviews: any[]
  onStatusUpdate?: () => void
}

export function DashboardContent({ activeTab, recentFeedback, externalReviews, onStatusUpdate }: DashboardContentProps) {
  const renderContent = () => {
    switch (activeTab) {
      case "internal":
        return <RecentFeedbackTab recentFeedback={recentFeedback} onStatusUpdate={onStatusUpdate} />
      case "external":
        return <ExternalReviewsTab externalReviews={externalReviews} />
      case "external-responses":
        return <ExternalReviewResponseManager />
      case "workflows":
        return <WorkflowManager />
      case "analytics":
        return <AnalyticsCharts />
      case "qr-codes":
        return <QRCodeGenerator />
      case "responses":
        return <ResponseManagementTab onStatusUpdate={onStatusUpdate} />
      case "ai-insights":
        return <AIInsights />
      case "inbox":
        return <WhatsAppInbox />
      case "settings":
        return (
          <div className="p-6">
            <h3 className="text-lg font-semibold mb-4">Settings</h3>
            <p className="text-muted-foreground">Application settings will be available here.</p>
          </div>
        )
      case "help":
        return (
          <div className="p-6">
            <h3 className="text-lg font-semibold mb-4">Help & Support</h3>
            <p className="text-muted-foreground">Help documentation and support resources will be available here.</p>
          </div>
        )
      default:
        return <RecentFeedbackTab recentFeedback={recentFeedback} onStatusUpdate={onStatusUpdate} />
    }
  }

  return (
    <div className="space-y-4">
      {renderContent()}
    </div>
  )
}