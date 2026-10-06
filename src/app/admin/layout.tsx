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
  X
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { signOut, getSession } from '@/app/actions/auth';

const NAV_LINKS = [
  { href: '/admin', label: 'Overview', icon: LayoutDashboard },
  { href: '/admin/setup', label: 'Setup', icon: Upload },
  { href: '/admin/teams', label: 'Teams & Registration', icon: Trophy },
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
      if (!session) {
        router.push('/login');
      }
    };
    checkAuth();
  }, [router]);

  const handleSignOut = async () => {
    await signOut();
    router.push('/login');
  };

  return (
    <div className="flex h-screen bg-[#0a0a0f] text-white overflow-hidden">
      {/* Mobile Header */}
      <div className="md:hidden flex items-center justify-between p-4 border-b border-[#2a2a3a] bg-[#16161f]">
        <h1 className="font-space-grotesk font-bold text-lg text-[#8b5cf6]">TFG ADMIN</h1>
        <button onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}>
          {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>

      {/* Sidebar */}
      <aside className={`
        fixed inset-y-0 left-0 z-50 w-64 bg-[#16161f] border-r border-[#2a2a3a] transform transition-transform duration-300 ease-in-out md:relative md:translate-x-0 flex flex-col
        ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        <div className="p-6">
          <h1 className="font-space-grotesk font-bold text-xl tracking-wider mb-2">
            THE FOUNDER&apos;S<br/><span className="text-[#8b5cf6]">GAMBIT</span>
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
                        ? 'bg-[#8b5cf6]/20 text-[#8b5cf6] border border-[#8b5cf6]/30' 
                        : 'text-gray-400 hover:bg-[#2a2a3a] hover:text-white'
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

        <div className="p-4 border-t border-[#2a2a3a]">
          <Button 
            variant="ghost" 
            className="w-full flex items-center justify-center space-x-2 text-gray-400 hover:text-white"
            onClick={handleSignOut}
          >
            <LogOut size={20} />
            <span>Sign Out</span>
          </Button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto p-4 md:p-8 bg-[#0a0a0f]">
        <div className="max-w-7xl mx-auto h-full">
          {children}
        </div>
      </main>
    </div>
  );
}
