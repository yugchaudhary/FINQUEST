'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { 
  LayoutDashboard, 
  Upload, 
  Radio, 
  Trophy, 
  ArrowRightLeft, 
  Tv, 
  Calculator, 
  ScrollText, 
  Settings, 
  LogOut,
  Menu,
  X,
  Tags,
  FileText,
  PiggyBank,
  Megaphone
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { signOut, getSession } from '@/app/actions/auth';

const NAV_LINKS = [
  { href: '/admin', label: 'Overview', icon: LayoutDashboard },
  { href: '/admin/setup', label: 'Setup', icon: Upload },
  { href: '/admin/teams', label: 'Teams & Registration', icon: Trophy },
  { href: '/admin/categories', label: 'Category Assignment', icon: Tags },
  { href: '/admin/investment-setup', label: 'Investment Setup', icon: PiggyBank },
  { href: '/admin/announcements', label: 'Announcements', icon: Megaphone },
  { href: '/admin/live-match', label: 'Live Match', icon: Radio },
  { href: '/admin/phase1-finale', label: 'Phase 1 Finale', icon: Trophy },
  { href: '/admin/finals-transition', label: 'Finals Transition', icon: ArrowRightLeft },
  { href: '/admin/finals-broadcast', label: 'Finals Broadcast', icon: Tv },
  { href: '/admin/finals-scoring', label: 'Finals Scoring', icon: Calculator },
  { href: '/admin/audit', label: 'Audit Log', icon: ScrollText },
  { href: '/admin/settings', label: 'Settings', icon: Settings },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [currentPhase, setCurrentPhase] = useState('SETUP');

  useEffect(() => {
    const checkAuth = async () => {
      const session = await getSession();
      if (!session || (!session.success && (session.error === 'Not authenticated' || session.error === 'Unauthorized'))) {
        router.push('/admin/login');
      }
    };
    checkAuth();
  }, [router]);

  const handleSignOut = async () => {
    await signOut();
    router.push('/login');
  };

  return (
    <div className="flex h-screen bg-background text-foreground overflow-hidden">
      {/* Mobile Header */}
      <div className="md:hidden flex items-center justify-between p-4 border-b border-border bg-surface">
        <h1 className="font-space-grotesk font-bold text-lg text-accent">FGP ADMIN</h1>
        <button onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}>
          {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>

      {/* Sidebar */}
      <aside className={`
        fixed inset-y-0 left-0 z-50 w-64 bg-surface border-r border-border transform transition-transform duration-300 ease-in-out md:relative md:translate-x-0 flex flex-col
        ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        <div className="p-6">
          <h1 className="font-space-grotesk font-bold text-xl tracking-wider mb-2">
            FOUNDER&apos;S GOT<br/><span className="text-accent">PATENT</span>
          </h1>
          <Badge variant="default" className="w-full justify-center">
            PHASE: {currentPhase}
          </Badge>
        </div>

        <nav className="flex-1 overflow-y-auto py-4">
          <ul className="space-y-2 px-4">
            {NAV_LINKS.map((link) => {
              const isActive = pathname === link.href || pathname.startsWith(`${link.href}/`);
              return (
                <li key={link.href}>
                  <Link 
                    href={link.href}
                    onClick={() => setIsMobileMenuOpen(false)}
                    className={`flex items-center space-x-3 px-4 py-3 rounded-lg transition-colors ${
                      isActive 
                        ? 'bg-accent/20 text-accent border border-accent/30' 
                        : 'text-slate-500 hover:bg-border hover:text-foreground'
                    }`}
                  >
                    <link.icon size={20} />
                    <span className="font-medium">{link.label}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        <div className="p-4 border-t border-border">
          <Button 
            variant="ghost" 
            className="w-full flex items-center justify-center space-x-2 text-slate-500 hover:text-foreground"
            onClick={handleSignOut}
          >
            <LogOut size={20} />
            <span>Sign Out</span>
          </Button>
        </div>
      </aside>

            {/* Main Content */}
      <main className="flex-1 overflow-y-auto p-4 md:p-8 bg-background relative">
        {/* Logo in top right */}
        <div className="absolute top-4 right-4 md:top-8 md:right-8 h-12 w-12 rounded-full overflow-hidden border border-border shadow-sm z-40 bg-surface">
          <img src="/logo.png" alt="FYI Logo" className="w-full h-full object-cover" />
        </div>
        <div className="max-w-7xl mx-auto h-full">
          {children}
        </div>
      </main>
    </div>
  );
}
