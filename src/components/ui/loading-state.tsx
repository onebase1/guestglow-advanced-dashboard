import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

interface LoadingStateProps {
  variant?: 'dashboard' | 'form' | 'table' | 'chart' | 'minimal';
  className?: string;
}

export function LoadingState({ variant = 'minimal', className = '' }: LoadingStateProps) {
  switch (variant) {
    case 'dashboard':
      return (
        <div className={`space-y-6 ${className}`}>
          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {Array.from({ length: 4 }).map((_, i) => (
              <Card key={i}>
                <CardContent className="p-6">
                  <div className="space-y-3">
                    <Skeleton className="h-4 w-1/2" />
                    <Skeleton className="h-8 w-3/4" />
                    <Skeleton className="h-3 w-full" />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
          
          {/* Main Content */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2">
              <Card>
                <CardContent className="p-6">
                  <Skeleton className="h-6 w-1/3 mb-4" />
                  <Skeleton className="h-64 w-full" />
                </CardContent>
              </Card>
            </div>
            <div>
              <Card>
                <CardContent className="p-6">
                  <Skeleton className="h-6 w-1/2 mb-4" />
                  <div className="space-y-3">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <div key={i} className="flex items-center space-x-4">
                        <Skeleton className="h-10 w-10 rounded-full" />
                        <div className="space-y-2 flex-1">
                          <Skeleton className="h-4 w-full" />
                          <Skeleton className="h-3 w-3/4" />
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      );

    case 'table':
      return (
        <Card className={className}>
          <CardContent className="p-6">
            <div className="space-y-4">
              <Skeleton className="h-6 w-1/4" />
              <div className="space-y-3">
                {Array.from({ length: 8 }).map((_, i) => (
                  <div key={i} className="grid grid-cols-4 gap-4">
                    <Skeleton className="h-4" />
                    <Skeleton className="h-4" />
                    <Skeleton className="h-4" />
                    <Skeleton className="h-4" />
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      );

    case 'chart':
      return (
        <Card className={className}>
          <CardContent className="p-6">
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <Skeleton className="h-6 w-1/3" />
                <Skeleton className="h-4 w-1/6" />
              </div>
              <Skeleton className="h-64 w-full" />
              <div className="flex justify-center gap-4">
                {Array.from({ length: 3 }).map((_, i) => (
                  <Skeleton key={i} className="h-4 w-16" />
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      );

    case 'form':
      return (
        <Card className={className}>
          <CardContent className="p-6">
            <div className="space-y-6">
              <Skeleton className="h-8 w-1/2" />
              <div className="space-y-4">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="space-y-2">
                    <Skeleton className="h-4 w-1/4" />
                    <Skeleton className="h-10 w-full" />
                  </div>
                ))}
              </div>
              <Skeleton className="h-10 w-1/3" />
            </div>
          </CardContent>
        </Card>
      );

    default:
      return (
        <div className={`flex items-center justify-center py-8 ${className}`}>
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      );
  }
}