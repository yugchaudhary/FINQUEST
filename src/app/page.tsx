'use client';

import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { getPhase1Leaderboard, getFinalsLeaderboard } from '@/app/actions/leaderboard';
import { Phase1Leaderboard } from '@/components/leaderboard/phase1-leaderboard';
import { FinalsLeaderboard } from '@/components/leaderboard/finals-leaderboard';
import { getEventState } from '@/app/actions/event-state';
import {
  Crown,
  Target,
  TrendingUp,
  Users,
  Trophy,
  Swords,
  ChevronRight,
  Zap,
  BarChart3,
  Shield,
  Utensils,
  Dumbbell,
  Plane,
  MonitorSmartphone,
  Banknote,
  Ghost
} from 'lucide-react';

const fadeIn = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.6 } }
};

const staggerContainer = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.2
    }
  }
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
        <section className="relative pt-32 pb-40 px-6 overflow-hidden">
          <div className="max-w-7xl mx-auto text-center">
            <motion.div
              initial="hidden"
              animate="visible"
              variants={fadeIn}
              className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-accent/10 border border-accent/20 text-accent text-sm font-bold mb-8"
            >
              <span className="w-2 h-2 rounded-full bg-accent animate-pulse-live"></span>
              Live Event Portal Active
            </motion.div>
            
            <motion.h1
              initial="hidden"
              animate="visible"
              variants={fadeIn}
              className="font-display text-5xl md:text-7xl lg:text-8xl font-black tracking-tighter mb-8 bg-clip-text text-transparent bg-gradient-to-br from-slate-900 via-slate-700 to-slate-900"
            >
              FOUNDER&apos;S GOT <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-accent to-blue-500">PATENT</span>
            </motion.h1>
            
            <motion.p
              initial="hidden"
              animate="visible"
              variants={fadeIn}
              className="text-lg md:text-xl text-slate-500 max-w-2xl mx-auto mb-12 font-light"
            >
              A strategic battle of ideas, conviction and calculated risk. Where visionary innovators meet strategic capital.
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

        {/* About Section */}
        <section className="py-24 px-6 bg-surface border-b border-border">
          <div className="max-w-7xl mx-auto">
            <motion.div
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
              variants={staggerContainer}
              className="grid grid-cols-1 md:grid-cols-3 gap-6"
            >
              {[
                { icon: Users, title: "Teams of 4", desc: "Collaborate and brainstorm with 3 other visionary founders." },
                { icon: Target, title: "6 Categories", desc: "Each with 20 distinct, chaotic problem statements to choose from." },
                { icon: Trophy, title: "1 Ultimate Pitch", desc: "Combine 4 problems into one product. Weird, funny, and pitchable wins!" }
              ].map((item, i) => (
                <motion.div key={i} variants={fadeIn}>
                  <Card className="bg-surface border-border hover:bg-surface-2 shadow-sm transition-colors h-full">
                    <CardContent className="p-8 text-center flex flex-col items-center">
                      <div className="w-14 h-14 rounded-2xl bg-accent/10 flex items-center justify-center mb-6 text-accent">
                        <item.icon className="w-7 h-7 animate-bounce-subtle" />
                      </div>
                      <h3 className="text-2xl font-display font-bold mb-2">{item.title}</h3>
                      <p className="text-slate-500">{item.desc}</p>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </motion.div>
          </div>
        </section>

        {/* How It Works */}
        <section className="py-32 px-6">
          <div className="max-w-7xl mx-auto">
            <div className="text-center mb-16">
              <h2 className="text-3xl md:text-5xl font-display font-bold mb-4">The Strategy</h2>
              <p className="text-slate-500 max-w-2xl mx-auto">Master the board. Navigate two intense phases of competition where every decision counts.</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
              <motion.div
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true }}
                variants={fadeIn}
                className="relative p-1 rounded-2xl bg-gradient-to-b from-blue-500/20 to-transparent"
              >
                <div className="bg-surface rounded-xl p-8 h-full border border-border shadow-md">
                  <Badge className="bg-blue-500/10 text-blue-400 hover:bg-blue-500/30 mb-6">Phase 1</Badge>
                  <h3 className="text-3xl font-display font-bold mb-4 flex items-center gap-3">
                    <Swords className="text-blue-500" />
                    The Investment
                  </h3>
                  <p className="text-slate-500 mb-8 leading-relaxed">
                    Investors evaluate innovators across intense rapid-fire pitch sessions. Place strategic bets, build conviction, and secure your position for the final board.
                  </p>
                  <ul className="space-y-4">
                    {[
                      "Rapid pitch evaluations",
                      "Strategic capital allocation",
                      "Dynamic leaderboards"
                    ].map((item, i) => (
                      <li key={i} className="flex items-center gap-3 text-sm font-medium text-slate-600">
                        <div className="w-6 h-6 rounded-full bg-blue-500/10 flex items-center justify-center text-blue-400 text-xs">
                          {i + 1}
                        </div>
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
              </motion.div>

              <motion.div
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true }}
                variants={fadeIn}
                className="relative p-1 rounded-2xl bg-gradient-to-b from-accent/20 to-transparent"
              >
                <div className="bg-surface rounded-xl p-8 h-full border border-border shadow-md">
                  <Badge className="bg-accent/10 text-accent hover:bg-accent/30 mb-6">Phase 2</Badge>
                  <h3 className="text-3xl font-display font-bold mb-4 flex items-center gap-3">
                    <Crown className="text-accent" />
                    The Finals
                  </h3>
                  <p className="text-slate-500 mb-8 leading-relaxed">
                    The top performers face off in the ultimate showdown. Deep diligence, rigorous Q&A, and final verdicts from the grandmaster judges.
                  </p>
                  <ul className="space-y-4">
                    {[
                      "Top team presentations",
                      "Live Q&A defense",
                      "Final judging & awards"
                    ].map((item, i) => (
                      <li key={i} className="flex items-center gap-3 text-sm font-medium text-slate-600">
                        <div className="w-6 h-6 rounded-full bg-accent/10 flex items-center justify-center text-accent text-xs">
                          {i + 1}
                        </div>
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
              </motion.div>
            </div>
          </div>
        </section>

        {/* Categories */}
        <section className="py-24 px-6 bg-surface border-t border-border">
          <div className="max-w-7xl mx-auto">
            <div className="text-center mb-16">
              <h2 className="text-3xl md:text-4xl font-display font-bold mb-4">Sectors of Play</h2>
            </div>
            <motion.div
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
              variants={staggerContainer}
              className="grid grid-cols-2 md:grid-cols-3 gap-6"
            >
              {[
                { name: "Let Us Cook", icon: Utensils, color: "text-orange-500" },
                { name: "What the Fit", icon: Dumbbell, color: "text-green-500" },
                { name: "Bon Voyage, Bestie", icon: Plane, color: "text-blue-500" },
                { name: "Digital Disorder", icon: MonitorSmartphone, color: "text-purple-500" },
                { name: "Cash & Chaos", icon: Banknote, color: "text-yellow-500" },
                { name: "Feeling 404", icon: Ghost, color: "text-slate-500" }
              ].map((cat, i) => (
                <motion.div key={i} variants={fadeIn}>
                  <Card className="bg-surface border-border hover:bg-surface-2 shadow-sm transition-colors cursor-pointer group">
                    <CardContent className="p-6 text-center flex flex-col items-center">
                      <cat.icon className={`w-8 h-8 mb-4 animate-float ${cat.color} group-hover:scale-110 transition-transform`} />
                      <h4 className="font-semibold text-lg">{cat.name}</h4>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </motion.div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="relative z-10 py-12 px-6 border-t border-white/10 bg-surface">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6 text-sm text-slate-500">
          <div className="flex items-center gap-2">
            <Crown className="w-4 h-4" />
            <span className="font-display font-semibold text-slate-600">FOUNDER&apos;S GOT PATENT</span>
          </div>
          <p>© {new Date().getFullYear()} Founder&apos;s Got Patent. All rights reserved.</p>
          <div className="flex gap-4">
            <a href="#" className="hover:text-foreground transition-colors">Twitter</a>
            <a href="#" className="hover:text-foreground transition-colors">LinkedIn</a>
            <a href="#" className="hover:text-foreground transition-colors">Contact</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
