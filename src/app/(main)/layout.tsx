import { BottomNav } from '@/components/layout/BottomNav';
import { DesktopNav } from '@/components/layout/DesktopNav';
import { SWRProvider } from '@/components/SWRProvider';

export default function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <SWRProvider>
      <div className="flex min-h-screen">
        {/* Desktop sidebar nav */}
        <DesktopNav />

        {/* Main content */}
        <div className="flex-1 flex flex-col w-full relative">
          
          <main className="flex-1 page-content w-full relative">
            <div className="mx-auto max-w-5xl px-4 pt-6 pb-24 md:px-8 md:py-10">
            {children}
          </div>
        </main>
        </div>
      </div>

      {/* Mobile bottom nav */}
      <BottomNav />

      {/* Health disclaimer */}
      <footer className="hidden md:block fixed bottom-0 left-0 right-0 text-center py-2 text-xs text-charcoal-600 bg-surface-50/80 backdrop-blur-sm border-t border-white/10 z-30">
        Daily Health is a personal tracking tool. Nutrition and image-analysis values are estimates and are not medical advice.
      </footer>
    </SWRProvider>
  );
}
