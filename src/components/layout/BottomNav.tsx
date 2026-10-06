'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState, useRef, useEffect } from 'react';
import { signOut } from 'next-auth/react';
import { DriveSyncWidget } from '@/components/DriveSyncWidget';

const navItems = [
  {
    href: '/',
    label: 'Today',
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
        <line x1="16" y1="2" x2="16" y2="6" />
        <line x1="8" y1="2" x2="8" y2="6" />
        <line x1="3" y1="10" x2="21" y2="10" />
        <circle cx="12" cy="16" r="1.5" fill="currentColor" stroke="none" />
      </svg>
    ),
  },
  {
    href: '/food',
    label: 'Food',
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M18 8h1a4 4 0 0 1 0 8h-1" />
        <path d="M2 8h16v9a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4V8z" />
        <line x1="6" y1="1" x2="6" y2="4" />
        <line x1="10" y1="1" x2="10" y2="4" />
        <line x1="14" y1="1" x2="14" y2="4" />
      </svg>
    ),
  },
  {
    href: '/progress',
    label: 'Progress',
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
      </svg>
    ),
  },
  {
    href: '/adviser',
    label: 'AI',
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
      </svg>
    ),
  },
];

export function BottomNav() {
  const pathname = usePathname();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close menu when route changes
  useEffect(() => {
    setIsMenuOpen(false);
  }, [pathname]);

  // Close menu when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsMenuOpen(false);
      }
    }
    if (isMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isMenuOpen]);

  return (
    <>
      {/* Expandable Menu Overlay */}
      {isMenuOpen && (
        <div className="md:hidden fixed inset-0 z-30 bg-black/50 backdrop-blur-sm transition-opacity" onClick={() => setIsMenuOpen(false)}></div>
      )}

      {/* Expandable Menu */}
      {isMenuOpen && (
        <div ref={menuRef} className="md:hidden fixed bottom-16 left-0 right-0 z-40 bg-[rgba(20,20,20,0.95)] backdrop-blur-xl rounded-t-2xl shadow-2xl safe-area-bottom pb-4 px-4 pt-6 animate-slide-up">
          <div className="flex flex-col gap-4">
            
            <Link href="/bmi" onClick={() => setIsMenuOpen(false)} className="flex items-center gap-3 px-3 py-3 rounded-xl hover:bg-white/5 transition-colors text-charcoal-200">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="text-charcoal-400">
                <path d="M6.5 6.5a3.5 3.5 0 1 0 7 0 3.5 3.5 0 1 0-7 0" />
                <path d="M2 21v-2a5 5 0 0 1 5-5h6a5 5 0 0 1 5 5v2" />
                <path d="M19 8l2 2 2-2" />
                <line x1="21" y1="3" x2="21" y2="10" />
              </svg>
              <span className="font-medium">BMI Calculator</span>
            </Link>
            
            <Link href="/settings" onClick={() => setIsMenuOpen(false)} className="flex items-center gap-3 px-3 py-3 rounded-xl hover:bg-white/5 transition-colors text-charcoal-200">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="text-charcoal-400">
                <circle cx="12" cy="12" r="3" />
                <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
              </svg>
              <span className="font-medium">Settings</span>
            </Link>

            <div className="bg-white/5 rounded-xl pt-2">
              <DriveSyncWidget />
            </div>

            <button
              onClick={() => signOut({ callbackUrl: '/login' })}
              className="flex w-full items-center gap-3 px-3 py-3 rounded-xl hover:bg-red-500/10 transition-colors text-red-400"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
                <polyline points="16 17 21 12 16 7"></polyline>
                <line x1="21" y1="12" x2="9" y2="12"></line>
              </svg>
              <span className="font-medium">Sign Out</span>
            </button>
            
          </div>
        </div>
      )}

      {/* Main Bottom Nav */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-[rgba(15,15,15,0.85)] backdrop-blur-xl z-40 safe-area-bottom">
        <div className="flex items-center justify-between h-16 px-1">
          {navItems.map((item) => {
            const isActive = item.href === '/' ? pathname === '/' : pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                prefetch={false}
                className={`flex-1 flex flex-col items-center justify-center gap-0.5 py-1.5 rounded-lg transition-colors min-w-0 duration-200 ${
                  isActive
                    ? 'text-brand-primary'
                    : 'text-charcoal-600 hover:text-white'
                }`}
                aria-label={item.label}
                aria-current={isActive ? 'page' : undefined}
              >
                {item.icon}
                <span className="text-[0.65rem] font-medium leading-none">{item.label}</span>
              </Link>
            );
          })}
          
          {/* More Menu Button */}
          <button
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            className={`flex-1 flex flex-col items-center justify-center gap-0.5 py-1.5 rounded-lg transition-colors min-w-0 ${
              isMenuOpen
                ? 'text-white'
                : 'text-charcoal-600 hover:text-white'
            }`}
            aria-label="More Options"
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <line x1="3" y1="12" x2="21" y2="12"></line>
              <line x1="3" y1="6" x2="21" y2="6"></line>
              <line x1="3" y1="18" x2="21" y2="18"></line>
            </svg>
            <span className="text-[0.65rem] font-medium leading-none">More</span>
          </button>
        </div>
      </nav>
    </>
  );
}
