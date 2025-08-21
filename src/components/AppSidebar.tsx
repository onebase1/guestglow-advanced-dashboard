import { useState } from "react"
import { useLocation, useNavigate } from "react-router-dom"
import {
  MessageSquare,
  Globe,
  Workflow,
  BarChart3,
  QrCode,
  MessageCircle,
  Brain,
  Hotel,
  Settings,
  HelpCircle
} from "lucide-react"
import { useTenantBranding } from "@/hooks/useTenantBranding"

import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  SidebarFooter,
  useSidebar,
} from "@/components/ui/sidebar"

const reviewManagementItems = [
  {
    id: "internal",
    title: "Internal Reviews",
    icon: MessageSquare,
    description: "Guest feedback from your property"
  },
  {
    id: "external",
    title: "External Reviews",
    icon: Globe,
    description: "Reviews from booking platforms"
  },
  {
    id: "external-responses",
    title: "Response Manager",
    icon: MessageSquare,
    description: "Approve AI responses to external reviews"
  },
  {
    id: "inbox",
    title: "Inbox",
    icon: MessageCircle,
    description: "WhatsApp conversations"
  },
]

const automationItems = [
  {
    id: "workflows",
    title: "Workflows",
    icon: Workflow,
    description: "Automated response workflows"
  },
  {
    id: "responses",
    title: "Response Management",
    icon: MessageCircle,
    description: "Manage guest responses"
  },
]

const analyticsItems = [
  {
    id: "analytics",
    title: "Analytics",
    icon: BarChart3,
    description: "Performance metrics and insights"
  },
  {
    id: "ai-insights",
    title: "AI Insights",
    icon: Brain,
    description: "Intelligent feedback analysis"
  },
]

const toolsItems = [
  {
    id: "qr-codes",
    title: "QR Codes",
    icon: QrCode,
    description: "Generate feedback collection codes"
  },
]

const utilityItems = [
  {
    id: "settings",
    title: "Settings",
    icon: Settings,
    description: "Application settings"
  },
  {
    id: "help",
    title: "Help & Support",
    icon: HelpCircle,
    description: "Get help and support"
  },
]

interface AppSidebarProps {
  activeTab: string
  onTabChange: (tab: string) => void
}

export function AppSidebar({ activeTab, onTabChange }: AppSidebarProps) {
  const { state } = useSidebar()
  const collapsed = state === "collapsed"
  const navigate = useNavigate()
  const tenantSlug = (typeof window !== 'undefined' ? window.location.pathname.split('/').filter(Boolean)[0] : '')
  const branding = useTenantBranding()


  return (
    <Sidebar className={collapsed ? "w-16" : "w-64"} collapsible="icon">
      <SidebarHeader className="border-b border-border/40">
        <div className="flex items-center gap-3 px-4 py-4">
          {branding.isEusbett ? (
            <>
              <img
                src={branding.logoUrl}
                alt={branding.name}
                className="h-8 w-auto"
              />
              {!collapsed && (
                <div>
                  <h2 className={`font-bold text-lg ${branding.isEusbett ? 'text-primary' : 'bg-gradient-to-r from-primary to-primary/80 bg-clip-text text-transparent'}`}>
                    {branding.name}
                  </h2>
                  <p className="text-xs text-muted-foreground">Management Dashboard</p>
                </div>
              )}
            </>
          ) : (
            <>
              <div className="h-8 w-8 bg-gradient-to-br from-primary to-primary/80 rounded-lg flex items-center justify-center">
                <Hotel className="h-5 w-5 text-primary-foreground" />
              </div>
              {!collapsed && (
                <div>
                  <h2 className="font-bold text-lg bg-gradient-to-r from-primary to-primary/80 bg-clip-text text-transparent">
                    Guest Glow
                  </h2>
                  <p className="text-xs text-muted-foreground">Management Dashboard</p>
                </div>
              )}
            </>
          )}
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel className={collapsed ? "sr-only" : ""}>
            Reviews
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {reviewManagementItems.map((item) => (
                <SidebarMenuItem key={item.id}>
                  <SidebarMenuButton
                    isActive={activeTab === item.id}
                    onClick={() => onTabChange(item.id)}
                    className="group flex items-center gap-3"
                    tooltip={collapsed ? item.title : undefined}
                  >
                    <item.icon className="h-4 w-4 flex-shrink-0" />
                    {!collapsed && (
                      <div className="flex flex-col items-start min-w-0">
                        <span className="font-medium">{item.title}</span>
                        <span className="text-xs text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity">
                          {item.description}
                        </span>
                      </div>
                    )}
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel className={collapsed ? "sr-only" : ""}>
            Automation
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {automationItems.map((item) => (
                <SidebarMenuItem key={item.id}>
                  <SidebarMenuButton
                    isActive={activeTab === item.id}
                    onClick={() => onTabChange(item.id)}
                    className="group flex items-center gap-3"
                    tooltip={collapsed ? item.title : undefined}
                  >
                    <item.icon className="h-4 w-4 flex-shrink-0" />
                    {!collapsed && (
                      <div className="flex flex-col items-start min-w-0">
                        <span className="font-medium">{item.title}</span>
                        <span className="text-xs text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity">
                          {item.description}
                        </span>
                      </div>
                    )}
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel className={collapsed ? "sr-only" : ""}>
            Analytics
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {analyticsItems.map((item) => (
                <SidebarMenuItem key={item.id}>
                  <SidebarMenuButton
                    isActive={activeTab === item.id}
                    onClick={() => onTabChange(item.id)}
                    className="group flex items-center gap-3"
                    tooltip={collapsed ? item.title : undefined}
                  >
                    <item.icon className="h-4 w-4 flex-shrink-0" />
                    {!collapsed && (
                      <div className="flex flex-col items-start min-w-0">
                        <span className="font-medium">{item.title}</span>
                        <span className="text-xs text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity">
                          {item.description}
                        </span>
                      </div>
                    )}
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel className={collapsed ? "sr-only" : ""}>
            Tools
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {/* Quick link to QR Studio (navigates to route) */}
              <SidebarMenuItem>
                <SidebarMenuButton
                  isActive={false}
                  onClick={() => tenantSlug && navigate(`/${tenantSlug}/qr-studio`)}
                  className="group flex items-center gap-3"
                  tooltip={collapsed ? 'QR Studio' : undefined}
                >
                  <QrCode className="h-4 w-4 flex-shrink-0" />
                  {!collapsed && (
                    <div className="flex flex-col items-start min-w-0">
                      <span className="font-medium">QR Studio</span>
                      <span className="text-xs text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity">
                        Generate and download QRs
                      </span>
                    </div>
                  )}
                </SidebarMenuButton>
              </SidebarMenuItem>
              {toolsItems.map((item) => (
                <SidebarMenuItem key={item.id}>
                  <SidebarMenuButton
                    isActive={activeTab === item.id}
                    onClick={() => onTabChange(item.id)}
                    className="group flex items-center gap-3"
                    tooltip={collapsed ? item.title : undefined}
                  >
                    <item.icon className="h-4 w-4 flex-shrink-0" />
                    {!collapsed && (
                      <div className="flex flex-col items-start min-w-0">
                        <span className="font-medium">{item.title}</span>
                        <span className="text-xs text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity">
                          {item.description}
                        </span>
                      </div>
                    )}
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="border-t border-border/40">
        <SidebarMenu>
          {utilityItems.map((item) => (
            <SidebarMenuItem key={item.id}>
              <SidebarMenuButton
                isActive={activeTab === item.id}
                onClick={() => onTabChange(item.id)}
                className="group flex items-center gap-3"
                tooltip={collapsed ? item.title : undefined}
              >
                <item.icon className="h-4 w-4 flex-shrink-0" />
                {!collapsed && (
                  <div className="flex flex-col items-start min-w-0">
                    <span className="font-medium">{item.title}</span>
                    <span className="text-xs text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity">
                      {item.description}
                    </span>
                  </div>
                )}
              </SidebarMenuButton>
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  )
}