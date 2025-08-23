import React, { useState } from "react";
import { useLocation, useNavigate, Link } from "react-router-dom"
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
  HelpCircle,
  LogOut,
  UserCog,
  Wrench,
  Video
} from "lucide-react"
import { useTenantBranding } from "@/hooks/useTenantBranding"
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

import {
  Sidebar,
  SidebarBody,
  SidebarLink,
  useSidebar,
} from "@/components/ui/sidebar"

interface AppSidebarProps {
  activeTab: string
  onTabChange: (tab: string) => void
}

export function AppSidebar({ activeTab, onTabChange }: AppSidebarProps) {
  const navigate = useNavigate()
  const tenantSlug = (typeof window !== 'undefined' ? window.location.pathname.split('/').filter(Boolean)[0] : '')
  const branding = useTenantBranding()

  const links = [
    {
      label: "Internal Reviews",
      href: "#",
      icon: (
        <MessageSquare className="text-neutral-700 dark:text-neutral-200 h-5 w-5 flex-shrink-0" />
      ),
      id: "internal"
    },
    {
      label: "External Reviews",
      href: "#",
      icon: (
        <Globe className="text-neutral-700 dark:text-neutral-200 h-5 w-5 flex-shrink-0" />
      ),
      id: "external"
    },
    {
      label: "Response Manager",
      href: "#",
      icon: (
        <MessageSquare className="text-neutral-700 dark:text-neutral-200 h-5 w-5 flex-shrink-0" />
      ),
      id: "external-responses"
    },
    {
      label: "Inbox",
      href: "#",
      icon: (
        <MessageCircle className="text-neutral-700 dark:text-neutral-200 h-5 w-5 flex-shrink-0" />
      ),
      id: "inbox"
    },
    {
      label: "Analytics",
      href: "#",
      icon: (
        <BarChart3 className="text-neutral-700 dark:text-neutral-200 h-5 w-5 flex-shrink-0" />
      ),
      id: "analytics"
    },
    {
      label: "AI Insights",
      href: "#",
      icon: (
        <Brain className="text-neutral-700 dark:text-neutral-200 h-5 w-5 flex-shrink-0" />
      ),
      id: "ai-insights"
    },
    {
      label: "QR Studio",
      href: tenantSlug ? `/${tenantSlug}/qr-studio` : "#",
      icon: (
        <QrCode className="text-neutral-700 dark:text-neutral-200 h-5 w-5 flex-shrink-0" />
      ),
      id: "qr-codes"
    },
    {
      label: "Marketing",
      href: tenantSlug ? `/${tenantSlug}/marketing` : "#",
      icon: (
        <Video className="text-neutral-700 dark:text-neutral-200 h-5 w-5 flex-shrink-0" />
      ),
      id: "marketing"
    },
    {
      label: "Go-Live Config",
      href: tenantSlug ? `/${tenantSlug}/go-live-config` : "#",
      icon: (
        <Wrench className="text-neutral-700 dark:text-neutral-200 h-5 w-5 flex-shrink-0" />
      ),
      id: "go-live-config"
    },
    {
      label: "Settings",
      href: "#",
      icon: (
        <Settings className="text-neutral-700 dark:text-neutral-200 h-5 w-5 flex-shrink-0" />
      ),
      id: "settings"
    },
  ];

  const { state } = useSidebar();
  const open = state !== "collapsed";

  return (
    <Sidebar className={open ? "w-64" : "w-16"} collapsible="icon">
      <SidebarBody className="justify-between gap-10">
        <div className="flex flex-col flex-1 overflow-y-auto overflow-x-hidden">
          {open ? <Logo branding={branding} /> : <LogoIcon branding={branding} />}
          <div className="mt-8 flex flex-col gap-1">
            {links.map((link, idx) => (
              <div
                key={idx}
                onClick={() => {
                  if (link.id === "qr-codes" && tenantSlug) {
                    navigate(`/${tenantSlug}/qr-studio`)
                  } else if (link.id === "marketing" && tenantSlug) {
                    navigate(`/${tenantSlug}/marketing`)
                  } else if (link.id === "go-live-config" && tenantSlug) {
                    navigate(`/${tenantSlug}/go-live-config`)
                  } else {
                    onTabChange(link.id)
                  }
                }}
                className={cn(
                  "cursor-pointer",
                  activeTab === link.id ? "bg-neutral-200 dark:bg-neutral-700 rounded-md" : ""
                )}
              >
                <SidebarLink link={link} />
              </div>
            ))}
          </div>
        </div>
        <div>
          <SidebarLink
            link={{
              label: "Manager Profile",
              href: "#",
              icon: (
                <UserCog className="h-7 w-7 flex-shrink-0 rounded-full text-neutral-700 dark:text-neutral-200" />
              ),
            }}
          />
        </div>
      </SidebarBody>
    </Sidebar>
  )
}

export const Logo = ({ branding }: { branding: any }) => {
  return (
    <Link
      to="#"
      className="font-normal flex space-x-2 items-center text-sm text-black py-1 relative z-20"
    >
      {branding.isEusbett ? (
        <>
          <img
            src={branding.logoUrl}
            alt={branding.name}
            className="h-8 w-auto flex-shrink-0"
          />
          <motion.span
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className={`font-medium ${branding.isEusbett ? 'text-primary' : 'text-black dark:text-white'} whitespace-pre`}
          >
            {branding.name}
          </motion.span>
        </>
      ) : (
        <>
          <div className="h-5 w-6 bg-gradient-to-br from-primary to-primary/80 rounded-br-lg rounded-tr-sm rounded-tl-lg rounded-bl-sm flex-shrink-0" />
          <motion.span
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="font-medium text-black dark:text-white whitespace-pre"
          >
            Guest Glow
          </motion.span>
        </>
      )}
    </Link>
  );
};

export const LogoIcon = ({ branding }: { branding: any }) => {
  return (
    <Link
      to="#"
      className="font-normal flex space-x-2 items-center text-sm text-black py-1 relative z-20"
    >
      {branding.isEusbett ? (
        <img
          src={branding.logoUrl}
          alt={branding.name}
          className="h-8 w-auto flex-shrink-0"
        />
      ) : (
        <div className="h-5 w-6 bg-gradient-to-br from-primary to-primary/80 rounded-br-lg rounded-tr-sm rounded-tl-lg rounded-bl-sm flex-shrink-0" />
      )}
    </Link>
  );
};