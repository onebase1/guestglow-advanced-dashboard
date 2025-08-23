import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { AppSidebar } from "@/components/AppSidebar";
import { SidebarProvider, SidebarTrigger, SidebarInset } from "@/components/ui/sidebar";
import { Play, Download, Share2, Eye } from 'lucide-react';
import marketingHero from '@/assets/marketing-hero.jpg';
import socialMediaPost from '@/assets/social-media-post.jpg';
import guestExperience from '@/assets/guest-experience.jpg';

const Marketing = () => {
  const videoScenes = [
    {
      title: "Problem Setup",
      duration: "0-15s",
      description: "Frustrated hotel manager with negative reviews vs happy guest experience",
      visual: "Split screen: Manager + disappointed guest"
    },
    {
      title: "QR Code Magic", 
      duration: "15-30s",
      description: "Guest scans QR → instant rating interface",
      visual: "Real QR scan to phone interface"
    },
    {
      title: "Smart Routing",
      duration: "30-45s", 
      description: "5-star = thank you, <5-star = detailed feedback",
      visual: "Dashboard showing smart routing logic"
    },
    {
      title: "Dashboard Power",
      duration: "45-60s",
      description: "Analytics, alerts, workflows in action", 
      visual: "Live dashboard with notifications"
    },
    {
      title: "Results & CTA",
      duration: "60-90s",
      description: "Before/after metrics + call to action",
      visual: "Success metrics + brand logo"
    }
  ];

  const marketingAssets = [
    {
      name: "Hero Marketing Image",
      type: "1280x720",
      description: "Professional logo design with QR integration",
      image: marketingHero,
      usage: "Website hero, YouTube thumbnail, presentations"
    },
    {
      name: "Social Media Post",
      type: "1024x1024", 
      description: "Mobile feedback interface showcase",
      image: socialMediaPost,
      usage: "Instagram, LinkedIn, Facebook posts"
    },
    {
      name: "Guest Experience", 
      type: "1600x900",
      description: "Hotel guest scanning QR code",
      image: guestExperience,
      usage: "Website banners, blog headers, email campaigns"
    }
  ];

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-gray-50 dark:bg-gray-950 text-gray-900 dark:text-gray-100">
        <AppSidebar activeTab="marketing" onTabChange={() => {}} />

        <SidebarInset className="flex-1">
          <header className="flex items-center justify-between h-16 border-b border-gray-200 dark:border-gray-800 px-6 bg-white dark:bg-gray-900">
            <div className="flex items-center gap-3 min-w-0">
              <SidebarTrigger />
              <div className="min-w-0">
                <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 truncate">
                  Video Marketing Strategy
                </h1>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Complete marketing materials for your hotel feedback app
                </p>
              </div>
            </div>
          </header>

          <div className="p-6 space-y-8">
            <div className="max-w-6xl mx-auto space-y-8">

        {/* Video Storyboard */}
        <Card>
          <CardContent className="p-6">
            <h2 className="text-2xl font-semibold mb-6 flex items-center gap-2">
              <Play className="h-6 w-6 text-primary" />
              Video Storyboard (60-90 seconds)
            </h2>
            <div className="grid gap-4">
              {videoScenes.map((scene, index) => (
                <div key={index} className="flex gap-4 p-4 rounded-lg bg-muted/50 border">
                  <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center font-bold text-primary">
                    {index + 1}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <h3 className="font-semibold">{scene.title}</h3>
                      <span className="text-sm text-muted-foreground bg-secondary px-2 py-1 rounded">
                        {scene.duration}
                      </span>
                    </div>
                    <p className="text-muted-foreground mb-1">{scene.description}</p>
                    <p className="text-sm text-primary font-medium">{scene.visual}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Marketing Assets */}
        <Card>
          <CardContent className="p-6">
            <h2 className="text-2xl font-semibold mb-6 flex items-center gap-2">
              <Eye className="h-6 w-6 text-primary" />
              Generated Marketing Assets
            </h2>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {marketingAssets.map((asset, index) => (
                <div key={index} className="space-y-4">
                  <div className="aspect-video rounded-lg overflow-hidden border">
                    <img 
                      src={asset.image} 
                      alt={asset.name}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="space-y-2">
                    <h3 className="font-semibold">{asset.name}</h3>
                    <p className="text-sm text-muted-foreground">{asset.description}</p>
                    <div className="flex items-center gap-2 text-xs">
                      <span className="bg-primary/10 text-primary px-2 py-1 rounded">
                        {asset.type}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      <strong>Usage:</strong> {asset.usage}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Key Messages */}
        <div className="grid md:grid-cols-2 gap-6">
          <Card>
            <CardContent className="p-6">
              <h3 className="text-xl font-semibold mb-4 text-green-600">✅ Value Propositions</h3>
              <ul className="space-y-2 text-sm">
                <li>• <strong>Prevention &gt; Reaction:</strong> Catch issues before public reviews</li>
                <li>• <strong>Zero Friction:</strong> QR scan = instant feedback</li>
                <li>• <strong>Smart Response:</strong> Only ask details when needed</li>
                <li>• <strong>Actionable Insights:</strong> Turn feedback into improvements</li>
                <li>• <strong>Time-Sensitive:</strong> Perfect for guests with flights to catch</li>
              </ul>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <h3 className="text-xl font-semibold mb-4 text-red-600">❌ Pain Points Solved</h3>
              <ul className="space-y-2 text-sm">
                <li>• Public negative reviews</li>
                <li>• No feedback visibility until too late</li>
                <li>• Complex systems guests ignore</li>
                <li>• Operational blindspots</li>
                <li>• Staff responsiveness gaps</li>
              </ul>
            </CardContent>
          </Card>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap gap-4 justify-center">
          <Button size="lg" className="gap-2">
            <Download className="h-4 w-4" />
            Download Strategy PDF
          </Button>
          <Button variant="outline" size="lg" className="gap-2">
            <Share2 className="h-4 w-4" />
            Share Assets
          </Button>
          <Button variant="secondary" size="lg" className="gap-2">
            <Play className="h-4 w-4" />
            Create Video Script
          </Button>
        </div>

            {/* Footer */}
            <div className="text-center text-sm text-muted-foreground">
              <p>Marketing strategy and assets generated by AI • Ready for video production</p>
            </div>
            </div>
          </div>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
};

export default Marketing;