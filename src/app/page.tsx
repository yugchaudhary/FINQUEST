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
  Shield
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
    <div className="min-h-screen bg-[#0a0a0f] text-white selection:bg-purple-500/30 font-sans">
      {/* Background Effects */}
      <div className="fixed inset-0 z-0 pointer-events-none">
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px]"></div>
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-purple-500/50 to-transparent"></div>
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-purple-500/20 rounded-full blur-[128px]"></div>
        <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-blue-500/20 rounded-full blur-[128px]"></div>
      </div>

      {/* Navigation */}
      <nav className="relative z-10 border-b border-white/10 bg-black/50 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-purple-600 to-blue-600 flex items-center justify-center">
              <Crown className="w-5 h-5 text-white" />
            </div>
            <span className="font-display font-bold text-xl tracking-tight">FINQUEST</span>
          </div>
          <div className="flex items-center gap-4">
            <Link href="/admin/login">
              <Button variant="ghost" className="text-gray-400 hover:text-white hover:bg-white/5">
                Admin
              </Button>
            </Link>
            <Link href="/login">
              <Button className="bg-purple-600 hover:bg-purple-700 text-white border-0">
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
              className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-500/10 border border-purple-500/20 text-purple-400 text-sm font-medium mb-8"
            >
              <span className="w-2 h-2 rounded-full bg-purple-500 animate-pulse"></span>
              Live Event Registration Open
            </motion.div>
            
            <motion.h1
              initial="hidden"
              animate="visible"
              variants={fadeIn}
              className="font-display text-5xl md:text-7xl lg:text-8xl font-black tracking-tighter mb-8 bg-clip-text text-transparent bg-gradient-to-br from-white via-gray-200 to-gray-500"
            >
              THE FOUNDER&apos;S <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-blue-500">GAMBIT</span>
            </motion.h1>
            
            <motion.p
              initial="hidden"
              animate="visible"
              variants={fadeIn}
              className="text-lg md:text-xl text-gray-400 max-w-2xl mx-auto mb-12 font-light"
            >
              A strategic battle of ideas, conviction and calculated risk. Where visionary innovators meet strategic capital.
            </motion.p>
            
            <motion.div
              initial="hidden"
              animate="visible"
              variants={fadeIn}
              className="flex flex-col sm:flex-row items-center justify-center gap-4"
            >
              <Link href="/register">
                <Button size="lg" className="h-14 px-8 text-lg bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white border-0 shadow-[0_0_40px_-10px_rgba(139,92,246,0.5)]">
                  REGISTER TEAM <ChevronRight className="ml-2 w-5 h-5" />
                </Button>
              </Link>
              <Link href="/login">
                <Button size="lg" variant="outline" className="h-14 px-8 text-lg">
                  PARTICIPANT LOGIN
                </Button>
              </Link>
            </motion.div>
          </div>
        </section>

        {/* Leaderboards (Live) */}
        {(showFinals && finalsLeaderboard.length > 0) ? (
          <section className="py-24 px-6 border-y border-white/5 bg-black/40 relative overflow-hidden">
            <div className="max-w-7xl mx-auto">
              <FinalsLeaderboard data={finalsLeaderboard} />
            </div>
          </section>
        ) : (phase1Leaderboard.length > 0 && (
          <section className="py-24 px-6 border-y border-white/5 bg-black/40 relative overflow-hidden">
            <div className="max-w-7xl mx-auto">
              <Phase1Leaderboard leaderboardData={phase1Leaderboard} />
            </div>
          </section>
        ))}

        {/* About Section */}
        <section className="py-24 px-6 bg-black/40 border-b border-white/5">
          <div className="max-w-7xl mx-auto">
            <motion.div
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
              variants={staggerContainer}
              className="grid grid-cols-1 md:grid-cols-3 gap-6"
            >
              {[
                { icon: Users, title: "20 Teams", desc: "Elite founders pitching their boldest visions." },
                { icon: Target, title: "10 Rounds", desc: "Intense evaluation and strategic maneuvering." },
                { icon: Trophy, title: "1 Champion", desc: "Only the strongest strategy will prevail." }
              ].map((item, i) => (
                <motion.div key={i} variants={fadeIn}>
                  <Card className="bg-white/5 border-white/10 hover:bg-white/10 transition-colors h-full">
                    <CardContent className="p-8 text-center flex flex-col items-center">
                      <div className="w-14 h-14 rounded-2xl bg-purple-500/20 flex items-center justify-center mb-6 text-purple-400">
                        <item.icon className="w-7 h-7" />
                      </div>
                      <h3 className="text-2xl font-display font-bold mb-2">{item.title}</h3>
                      <p className="text-gray-400">{item.desc}</p>
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
              <p className="text-gray-400 max-w-2xl mx-auto">Master the board. Navigate two intense phases of competition where every decision counts.</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
              <motion.div
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true }}
                variants={fadeIn}
                className="relative p-1 rounded-2xl bg-gradient-to-b from-blue-500/20 to-transparent"
              >
                <div className="bg-[#0a0a0f] rounded-xl p-8 h-full border border-blue-500/20">
                  <Badge className="bg-blue-500/20 text-blue-400 hover:bg-blue-500/30 mb-6">Phase 1</Badge>
                  <h3 className="text-3xl font-display font-bold mb-4 flex items-center gap-3">
                    <Swords className="text-blue-500" />
                    The Gambit
                  </h3>
                  <p className="text-gray-400 mb-8 leading-relaxed">
                    Investors evaluate innovators across intense rapid-fire pitch sessions. Place strategic bets, build conviction, and secure your position for the final board.
                  </p>
                  <ul className="space-y-4">
                    {[
                      "Rapid pitch evaluations",
                      "Strategic capital allocation",
                      "Dynamic leaderboards"
                    ].map((item, i) => (
                      <li key={i} className="flex items-center gap-3 text-sm font-medium text-gray-300">
                        <div className="w-6 h-6 rounded-full bg-blue-500/20 flex items-center justify-center text-blue-400 text-xs">
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
                className="relative p-1 rounded-2xl bg-gradient-to-b from-purple-500/20 to-transparent"
              >
                <div className="bg-[#0a0a0f] rounded-xl p-8 h-full border border-purple-500/20">
                  <Badge className="bg-purple-500/20 text-purple-400 hover:bg-purple-500/30 mb-6">Phase 2</Badge>
                  <h3 className="text-3xl font-display font-bold mb-4 flex items-center gap-3">
                    <Crown className="text-purple-500" />
                    The Finals
                  </h3>
                  <p className="text-gray-400 mb-8 leading-relaxed">
                    The top performers face off in the ultimate showdown. Deep diligence, rigorous Q&A, and final verdicts from the grandmaster judges.
                  </p>
                  <ul className="space-y-4">
                    {[
                      "Top team presentations",
                      "Live Q&A defense",
                      "Final judging & awards"
                    ].map((item, i) => (
                      <li key={i} className="flex items-center gap-3 text-sm font-medium text-gray-300">
                        <div className="w-6 h-6 rounded-full bg-purple-500/20 flex items-center justify-center text-purple-400 text-xs">
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
        <section className="py-24 px-6 bg-black/40 border-t border-white/5">
          <div className="max-w-7xl mx-auto">
            <div className="text-center mb-16">
              <h2 className="text-3xl md:text-4xl font-display font-bold mb-4">Sectors of Play</h2>
            </div>
            <motion.div
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
              variants={staggerContainer}
              className="grid grid-cols-2 md:grid-cols-4 gap-4"
            >
              {[
                { name: "Tech & AI", icon: Zap, color: "text-yellow-500" },
                { name: "Finance", icon: BarChart3, color: "text-green-500" },
                { name: "Health", icon: Shield, color: "text-blue-500" },
                { name: "Impact", icon: TrendingUp, color: "text-purple-500" }
              ].map((cat, i) => (
                <motion.div key={i} variants={fadeIn}>
                  <Card className="bg-white/5 border-white/10 hover:bg-white/10 transition-colors cursor-pointer group">
                    <CardContent className="p-6 text-center flex flex-col items-center">
                      <cat.icon className={`w-8 h-8 mb-4 ${cat.color} group-hover:scale-110 transition-transform`} />
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
      <footer className="relative z-10 py-12 px-6 border-t border-white/10 bg-black">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6 text-sm text-gray-500">
          <div className="flex items-center gap-2">
            <Crown className="w-4 h-4" />
            <span className="font-display font-semibold text-gray-300">FINQUEST</span>
          </div>
          <p>© {new Date().getFullYear()} The Founder&apos;s Gambit. All rights reserved.</p>
          <div className="flex gap-4">
            <a href="#" className="hover:text-white transition-colors">Twitter</a>
            <a href="#" className="hover:text-white transition-colors">LinkedIn</a>
            <a href="#" className="hover:text-white transition-colors">Contact</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
