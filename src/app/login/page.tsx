'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { ChevronLeft, Key, Loader2, Users, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { signIn } from '@/app/actions/auth';

export default function LoginPage() {
  const router = useRouter();
  const [teamName, setTeamName] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      const result = await signIn(teamName, password);
      
      if (!result?.success || result?.error) {
        setError(result?.error || 'Invalid credentials');
      } else {
        router.refresh();
        router.push('/dashboard');
      }
    } catch (err: any) {
      setError(err?.message || 'An unexpected error occurred. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8 selection:bg-accent/30">
      <div className="relative z-10 sm:mx-auto sm:w-full sm:max-w-md">
        <Link href="/" className="inline-flex items-center text-sm font-bold text-slate-600 hover:text-black mb-8 group transition-colors">
          <ChevronLeft className="w-4 h-4 mr-1 group-hover:-translate-x-1 transition-transform" />
          Back to Event
        </Link>
        
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
        >
          <div className="text-center mb-8">
            <h2 className="text-3xl font-display font-black tracking-tight text-foreground mb-2">
              FOUNDER&apos;S GOT <span className="text-accent-dark">PATENT</span>
            </h2>
            <p className="text-slate-600 font-medium">Participant Team Portal</p>
          </div>

          <Card className="border-2 border-black bg-surface shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] rounded-xl">
            <CardHeader className="border-b-2 border-black/5 pb-4">
              <CardTitle className="text-xl font-display font-black flex items-center gap-2">
                <Users className="w-5 h-5 text-accent-dark" />
                Team Login
              </CardTitle>
              <CardDescription className="text-slate-500 font-medium">
                Enter your Team Name and Password provided by event organizers.
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-6">
              <form onSubmit={handleSubmit} className="space-y-5">
                {error && (
                  <div className="p-3.5 rounded-lg bg-red-50 border-2 border-red-500 text-red-700 text-xs font-bold flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" />
                    <span>{error}</span>
                  </div>
                )}
                
                <div className="space-y-1.5">
                  <Input
                    label="Team Name"
                    type="text"
                    required
                    value={teamName}
                    onChange={(e) => setTeamName(e.target.value)}
                    placeholder="e.g. NeuralForge"
                    className="border-2 border-black bg-white font-medium"
                    autoFocus
                  />
                </div>

                <div className="space-y-1.5">
                  <Input
                    label="Password"
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="border-2 border-black bg-white font-medium"
                  />
                </div>

                <Button
                  type="submit"
                  disabled={isLoading}
                  className="w-full h-12 text-base font-black uppercase tracking-wider bg-accent hover:bg-[#4ea2c0] text-black border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] transition-all"
                >
                  {isLoading ? (
                    <div className="flex items-center gap-2">
                      <Loader2 className="w-5 h-5 animate-spin" />
                      <span>Authenticating...</span>
                    </div>
                  ) : (
                    "Sign In to Dashboard →"
                  )}
                </Button>
              </form>
            </CardContent>
            <CardFooter className="flex flex-col gap-2 justify-center border-t-2 border-black/5 pt-4 text-center">
              <p className="text-xs text-slate-500 font-medium">
                Team credentials are distributed by event coordinators.
              </p>
              <Link href="/admin/login" className="text-xs font-bold text-slate-400 hover:text-black transition-colors">
                Organizers / Admin Sign In →
              </Link>
            </CardFooter>
          </Card>
        </motion.div>
      </div>
    </div>
  );
}
