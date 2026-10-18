'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { ChevronLeft, Key, Loader2, ShieldAlert, Mail, Eye, EyeOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { signInAdmin } from '@/app/actions/auth';

export default function AdminLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      const result = await signInAdmin(email, password);
      
      if (result?.error) {
        setError(result.error);
      } else {
        router.refresh();
        router.push('/admin');
      }
    } catch (err) {
      setError('An unexpected error occurred. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background text-white flex flex-col justify-center py-12 sm:px-6 lg:px-8 selection:bg-red-500/30">
      {/* Background Effect */}
      <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[800px] h-[800px] bg-red-600/10 rounded-full blur-[120px] opacity-50"></div>
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px]"></div>
      </div>

      <div className="relative z-10 sm:mx-auto sm:w-full sm:max-w-md">
        <Link href="/" className="inline-flex items-center text-sm font-medium text-slate-500 hover:text-foreground mb-8 group transition-colors">
          <ChevronLeft className="w-4 h-4 mr-1 group-hover:-translate-x-1 transition-transform" />
          Back to Event
        </Link>
        
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-red-500/10 mb-4 border border-red-500/20">
              <ShieldAlert className="w-8 h-8 text-red-500" />
            </div>
            <h2 className="text-3xl font-display font-black tracking-tight text-foreground mb-2">
              ADMIN CONTROL CENTER
            </h2>
            <p className="text-slate-500 uppercase tracking-widest text-sm font-semibold">Authorized Personnel Only</p>
          </div>

          <Card className="bg-surface/5 border-red-500/20 backdrop-blur-xl shadow-2xl">
            <CardHeader>
              <CardTitle className="text-xl text-red-100">System Access</CardTitle>
              <CardDescription className="text-slate-500">Enter administrator credentials to proceed.</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-6">
                {error && (
                  <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
                    {error}
                  </div>
                )}
                
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-600 flex items-center gap-2">
                    <Mail className="w-4 h-4 text-red-400" />
                    Admin Email
                  </label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full bg-black/50 border border-white/10 rounded-lg px-4 py-2.5 text-white placeholder:text-gray-600 focus:outline-none focus:ring-2 focus:ring-red-500/50 focus:border-red-500/50 transition-all"
                    placeholder="admin@finquest.com"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-600 flex items-center gap-2">
                    <Key className="w-4 h-4 text-red-400" />
                    Access Key
                  </label>
                  <div className="relative flex items-center">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full bg-black/50 border border-white/10 rounded-lg pl-4 pr-10 py-2.5 text-white placeholder:text-gray-600 focus:outline-none focus:ring-2 focus:ring-red-500/50 focus:border-red-500/50 transition-all"
                      placeholder="••••••••"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 text-gray-400 hover:text-white transition-colors focus:outline-none p-1"
                      tabIndex={-1}
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <Button
                  type="submit"
                  disabled={isLoading}
                  className="w-full h-11 bg-red-600 hover:bg-red-700 text-white border-0 shadow-[0_0_20px_-5px_rgba(239,68,68,0.5)] transition-all duration-300"
                >
                  {isLoading ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    "Authorize Access"
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  );
}
