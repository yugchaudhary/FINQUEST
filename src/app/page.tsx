'use client';

import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { getPhase1Leaderboard, getFinalsLeaderboard } from '@/app/actions/leaderboard';
import { Phase1Leaderboard } from '@/components/leaderboard/phase1-leaderboard';
import { FinalsLeaderboard } from '@/components/leaderboard/finals-leaderboard';
import { getEventState } from '@/app/actions/event-state';
import { ChevronRight } from 'lucide-react';

const fadeIn = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.6 } }
};

export default function LandingPage() {
  const [phase1Leaderboard, setPhase1Leaderboard] = useState<any[]>([]);
  const [finalsLeaderboard, setFinalsLeaderboard] = useState<any[]>([]);
  const [showFinals, setShowFinals] = useState(false);

  useEffect(() => {
    const fetchAll = async () => {
      try {
        const [p1Res, fRes, eRes] = await Promise.all([
          getPhase1Leaderboard(),
          getFinalsLeaderboard(),
          getEventState()
        ]);
        if (p1Res?.success) setPhase1Leaderboard(p1Res.data || []);
        if (fRes?.success) setFinalsLeaderboard(fRes.data || []);
        if (eRes?.success && eRes.data?.eventState?.final_leaderboard_active) {
          setShowFinals(true);
        }
      } catch (e) {
        console.error(e);
      }
    };
    fetchAll();
  }, []);

  return (
    <div className="min-h-screen bg-background text-foreground selection:bg-accent/30 font-sans">
      {/* Background Effects */}
      <div className="fixed inset-0 z-0 pointer-events-none">
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#00000008_1px,transparent_1px),linear-gradient(to_bottom,#00000008_1px,transparent_1px)] bg-[size:24px_24px]"></div>
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-accent/30 to-transparent"></div>
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-accent/10 rounded-full blur-[128px]"></div>
        <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-blue-500/10 rounded-full blur-[128px]"></div>
      </div>

      {/* Navigation */}
      <nav className="relative z-10 border-b border-border bg-surface/80 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg overflow-hidden border border-border shadow-sm"><img src="/logo.png" alt="FYI" className="w-full h-full object-cover" /></div>
            <span className="font-display font-black text-xl tracking-tight text-foreground">FOUNDER&apos;S GOT PATENT</span>
          </div>
          <div className="flex items-center gap-4">
            <Link href="/admin/login">
              <Button variant="ghost" className="text-slate-500 hover:bg-slate-100">
                Admin
              </Button>
            </Link>
            <Link href="/login">
              <Button className="bg-[#5eb3d1] hover:bg-[#4ea2c0] text-foreground border-0">
                Participant Login
              </Button>
            </Link>
          </div>
        </div>
      </nav>

      <main className="relative z-10">
        {/* Hero Section */}
        <section className="relative min-h-[calc(100vh-5rem)] flex flex-col justify-center items-center px-6 py-8 overflow-hidden">
          <div className="max-w-7xl mx-auto text-center w-full">
            <motion.div
              initial="hidden"
              animate="visible"
              variants={fadeIn}
              className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-accent/10 border border-accent/20 text-accent text-sm font-bold mb-3 md:mb-4"
            >
              <span className="w-2 h-2 rounded-full bg-accent animate-pulse-live"></span>
              Live Event Portal Active
            </motion.div>
            
            <motion.div
              initial="hidden"
              animate="visible"
              variants={fadeIn}
              className="flex justify-center items-center mb-3 md:mb-4"
            >
              <h1 className="sr-only">FOUNDER&apos;S GOT PATENT</h1>
              <img
                src="/founders-got-patent-banner.png"
                alt="Founder's Got Patent"
                className="w-full max-w-sm sm:max-w-md md:max-w-xl lg:max-w-2xl max-h-[220px] md:max-h-[260px] h-auto object-contain select-none mx-auto"
              />
            </motion.div>
            
            <motion.p
              initial="hidden"
              animate="visible"
              variants={fadeIn}
              className="text-base md:text-lg text-slate-500 max-w-2xl mx-auto mb-6 md:mb-8 font-light"
            >
              A strategic battle of ideas, conviction and calculated risk. Where visionary founders meet strategic capital.
            </motion.p>
            
            <motion.div
              initial="hidden"
              animate="visible"
              variants={fadeIn}
              className="flex items-center justify-center gap-4"
            >
              <Link href="/login">
                <Button size="xl" className="h-16 px-10 text-lg bg-accent hover:bg-[#4ea2c0] text-black border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] font-black uppercase tracking-wider">
                  PARTICIPANT LOGIN <ChevronRight className="ml-2 w-6 h-6" />
                </Button>
              </Link>
            </motion.div>
          </div>
        </section>

        {/* Leaderboards (Live) */}
        {(showFinals && finalsLeaderboard.length > 0) ? (
          <section className="py-24 px-6 border-y border-border bg-surface relative overflow-hidden">
            <div className="max-w-7xl mx-auto">
              <FinalsLeaderboard data={finalsLeaderboard} />
            </div>
          </section>
        ) : (phase1Leaderboard.length > 0 && (
          <section className="py-24 px-6 border-y border-border bg-surface relative overflow-hidden">
            <div className="max-w-7xl mx-auto">
              <Phase1Leaderboard leaderboardData={phase1Leaderboard} />
            </div>
          </section>
        ))}
      </main>
    </div>
  );
}
