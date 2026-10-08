'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { ChevronLeft, Key, Loader2, Mail } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { signIn } from '@/app/actions/auth';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      const result = await signIn(email);
      
      if (result?.error) {
        setError(result.error);
      } else {
        router.push('/dashboard');
      }
    } catch (err) {
      setError('An unexpected error occurred. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white flex flex-col justify-center py-12 sm:px-6 lg:px-8 selection:bg-purple-500/30">
      {/* Background Effect */}
      <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[800px] h-[800px] bg-purple-600/10 rounded-full blur-[120px] opacity-50"></div>
      </div>

      <div className="relative z-10 sm:mx-auto sm:w-full sm:max-w-md">
        <Link href="/" className="inline-flex items-center text-sm font-medium text-gray-400 hover:text-white mb-8 group transition-colors">
          <ChevronLeft className="w-4 h-4 mr-1 group-hover:-translate-x-1 transition-transform" />
          Back to Event
        </Link>
        
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <div className="text-center mb-8">
            <h2 className="text-3xl font-display font-black tracking-tight text-white mb-2">
              FOUNDER&apos;S GOT PATENT
            </h2>
            <p className="text-gray-400">Sign in to your participant account</p>
          </div>

          <Card className="bg-white/5 border-white/10 backdrop-blur-xl shadow-2xl">
            <CardHeader>
              <CardTitle className="text-xl">Welcome Back</CardTitle>
              <CardDescription className="text-gray-400">Enter your credentials to access the board.</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-6">
                {error && (
                  <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
                    {error}
                  </div>
                )}
                
                <div className="space-y-2">
                  <Input
                    label="Registration Number"
                    type="text"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="e.g. REG-12345"
                  />
                </div>


                <Button
                  type="submit"
                  disabled={isLoading}
                  className="w-full h-11 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white border-0 shadow-[0_0_20px_-5px_rgba(139,92,246,0.5)] transition-all duration-300"
                >
                  {isLoading ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    "Make Your Move"
                  )}
                </Button>
              </form>
            </CardContent>
            <CardFooter className="flex justify-center border-t border-white/5 pt-6">
              <p className="text-sm text-gray-500">
                Need access? Contact the event organizers.
              </p>
            </CardFooter>
          </Card>
        </motion.div>
      </div>
    </div>
  );
}
