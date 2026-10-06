'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { signOut } from 'next-auth/react';
import { DriveSyncWidget } from '@/components/DriveSyncWidget';

const navItems = [
  { href: '/', label: 'Today' },
  { href: '/food', label: 'Food' },
  { href: '/progress', label: 'Progress' },
  { href: '/bmi', label: 'BMI' },
  { href: '/adviser', label: 'AI Adviser' },
  { href: '/settings', label: 'Settings' },
];

export function DesktopNav() {
  const pathname = usePathname();

  return (
    <aside className="hidden md:flex flex-col w-56 min-h-screen bg-[rgba(20,20,20,0.7)] backdrop-blur-xl border-r border-white/10 sticky top-0 z-20">
      {/* App name */}
      <div className="px-6 py-6 border-b border-white/10">
        <h1 className="text-lg font-semibold text-white tracking-tight">
          Daily Health
        </h1>
        <p className="text-xs text-brand-primary mt-0.5 font-medium tracking-wide uppercase">Tracker</p>
      </div>

      {/* Nav links */}
      <nav className="flex-1 px-3 py-4 space-y-1" aria-label="Main navigation">
        {navItems.map((item) => {
          const isActive = item.href === '/' ? pathname === '/' : pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              prefetch={false}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 ${
                isActive
                  ? 'bg-[rgba(45,212,191,0.15)] text-brand-400 shadow-[inset_0_0_10px_rgba(45,212,191,0.1)]'
                  : 'text-charcoal-600 hover:bg-[rgba(255,255,255,0.05)] hover:text-white'
              }`}
              aria-current={isActive ? 'page' : undefined}
            >
              {item.label}
            </Link>
          );
        })}
      </nav>

      {/* Google Drive Sync Controls */}
      <DriveSyncWidget />

      {/* Logout Button */}
      <div className="px-3 pb-4">
        <button
          onClick={() => signOut({ callbackUrl: '/login' })}
          className="flex w-full items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-red-400 hover:bg-[rgba(220,38,38,0.1)] hover:text-red-300 transition-all"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
            <polyline points="16 17 21 12 16 7"></polyline>
            <line x1="21" y1="12" x2="9" y2="12"></line>
          </svg>
          Sign out
        </button>
      </div>

      {/* Footer disclaimer */}
      <div className="px-4 py-4 border-t border-surface-100">
        <p className="text-[0.65rem] text-charcoal-300 leading-relaxed">
          Nutrition values are estimates and are not medical advice.
        </p>
      </div>
    </aside>
  );
}
