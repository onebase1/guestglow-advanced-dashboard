import { useParams } from "react-router-dom";
import { AppSidebar } from "@/components/AppSidebar";
import { SidebarProvider, SidebarTrigger, SidebarInset } from "@/components/ui/sidebar";

export default function QRStudio() {
  const { tenantSlug } = useParams();
  const src = `/dynamic-qr.html${tenantSlug ? `?tenant=${tenantSlug}` : ''}`;

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-gray-50 dark:bg-gray-950 text-gray-900 dark:text-gray-100">
        <AppSidebar activeTab="qr-codes" onTabChange={() => {}} />

        <SidebarInset className="flex-1">
          <header className="flex items-center justify-between h-16 border-b border-gray-200 dark:border-gray-800 px-6 bg-white dark:bg-gray-900">
            <div className="flex items-center gap-3 min-w-0">
              <SidebarTrigger />
              <div className="min-w-0">
                <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 truncate">
                  QR Studio
                </h1>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Generate QR codes for feedback collection
                </p>
              </div>
            </div>
          </header>

          <div className="w-full h-[calc(100vh-64px)]">
            <iframe
              src={src}
              title="QR Studio"
              className="w-full h-full border-0"
            />
          </div>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}

