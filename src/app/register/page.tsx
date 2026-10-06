'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardHeader, CardContent } from '@/components/ui/card';
import { Select } from '@/components/ui/select';
import { registerLeader, registerMember } from '@/app/actions/auth';
import { Shield, Target, CheckCircle2, XCircle, Users, User, ArrowLeft, Copy } from 'lucide-react';

export default function RegisterPage() {
  const router = useRouter();
  
  // Steps: 1 = Role Select, 2 = Form, 3 = Success (for leader code sharing)
  const [step, setStep] = useState(1);
  const [role, setRole] = useState<'leader' | 'member' | null>(null);

  // Common Fields
  const [name, setName] = useState('');
  const [emailPrefix, setEmailPrefix] = useState('');
  
  // Leader Fields
  const [teamName, setTeamName] = useState('');
  const [category, setCategory] = useState('Technology');
  
  // Member Fields
  const [joinCode, setJoinCode] = useState('');

  // Status
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // For Leader Success
  const [generatedCode, setGeneratedCode] = useState<string>('');
  const [copied, setCopied] = useState(false);

  const categories = [
    { label: 'Technology', value: 'Technology' },
    { label: 'Healthcare', value: 'Healthcare' },
    { label: 'Finance', value: 'Finance' },
    { label: 'Social Impact', value: 'Social Impact' }
  ];

  const handleSelectRole = (selectedRole: 'leader' | 'member') => {
    setRole(selectedRole);
    setStep(2);
    setError(null);
  };

  const handleBack = () => {
    if (step === 2) {
      setStep(1);
      setRole(null);
      setError(null);
    }
  };

  const copyCode = () => {
    navigator.clipboard.writeText(generatedCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    const fullEmail = `${emailPrefix}@finfest.com`;

    try {
      if (role === 'leader') {
        const result = await registerLeader({
          leader_name: name,
          team_name: teamName,
          registration_number: emailPrefix,
          category
        });

        if (result?.error) {
          setError(result.error);
        } else if (result?.join_code) {
          setGeneratedCode(result.join_code);
          setStep(3); // Show the code to the leader
        }
      } else if (role === 'member') {
        const result = await registerMember({
          member_name: name,
          registration_number: emailPrefix,
          join_code: joinCode
        });

        if (result?.error) {
          setError(result.error);
        } else {
          router.push('/dashboard');
        }
      }
    } catch (err) {
      setError('An unexpected error occurred. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center p-6 text-white relative">
      <div className="absolute top-8 left-8">
        <Link href="/">
          <div className="flex items-center gap-2 font-display text-xl font-bold tracking-widest text-white/80 hover:text-white transition-colors cursor-pointer">
            <Shield className="w-6 h-6 text-purple-500" />
            <span>FG</span>
          </div>
        </Link>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md"
      >
        <Card variant="glass" className="w-full">
          {step === 1 && (
            <>
              <CardHeader className="text-center pb-2">
                <div className="mx-auto w-12 h-12 bg-purple-500/10 rounded-full flex items-center justify-center mb-4">
                  <Users className="w-6 h-6 text-purple-400" />
                </div>
                <h1 className="text-2xl font-space-grotesk font-bold tracking-wide">Join the Event</h1>
                <p className="text-sm text-gray-400 mt-2">Are you creating a new team or joining an existing one?</p>
              </CardHeader>
              <CardContent className="space-y-4">
                <Button 
                  variant="outline" 
                  className="w-full h-16 text-lg justify-start px-6 border-[#2a2a3a] hover:bg-purple-500/10 hover:border-purple-500/30"
                  onClick={() => handleSelectRole('leader')}
                >
                  <Target className="w-5 h-5 mr-4 text-purple-400" />
                  I am a Team Leader
                </Button>
                <Button 
                  variant="outline" 
                  className="w-full h-16 text-lg justify-start px-6 border-[#2a2a3a] hover:bg-blue-500/10 hover:border-blue-500/30"
                  onClick={() => handleSelectRole('member')}
                >
                  <User className="w-5 h-5 mr-4 text-blue-400" />
                  I am a Team Member
                </Button>
                
                <div className="mt-6 text-center text-sm text-gray-400">
                  Already have an account?{' '}
                  <Link href="/login" className="text-purple-400 hover:text-purple-300 transition-colors">
                    Sign in
                  </Link>
                </div>
              </CardContent>
            </>
          )}

          {step === 2 && (
            <>
              <CardHeader className="text-center pb-2 relative">
                <button 
                  onClick={handleBack}
                  className="absolute left-6 top-6 text-gray-400 hover:text-white transition-colors"
                >
                  <ArrowLeft className="w-5 h-5" />
                </button>
                <div className={`mx-auto w-12 h-12 rounded-full flex items-center justify-center mb-4 ${role === 'leader' ? 'bg-purple-500/10 text-purple-400' : 'bg-blue-500/10 text-blue-400'}`}>
                  {role === 'leader' ? <Target className="w-6 h-6" /> : <User className="w-6 h-6" />}
                </div>
                <h1 className="text-2xl font-space-grotesk font-bold tracking-wide">
                  {role === 'leader' ? 'Create Team' : 'Join Team'}
                </h1>
                <p className="text-sm text-gray-400 mt-2">
                  {role === 'leader' ? 'Register your team and get an invite code.' : 'Enter the invite code from your team leader.'}
                </p>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit} className="space-y-4">
                  {error && (
                    <div className="p-3 bg-red-500/10 border border-red-500/50 rounded flex items-center gap-2 text-sm text-red-400">
                      <Shield className="w-4 h-4" />
                      {error}
                    </div>
                  )}

                  <Input
                    label="Your Name"
                    type="text"
                    placeholder="Full Name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                  />
                  
                  {role === 'leader' ? (
                    <>
                      <Input
                        label="Team Name"
                        type="text"
                        placeholder="E.g. NeuralForge"
                        value={teamName}
                        onChange={(e) => setTeamName(e.target.value)}
                        required
                      />
                      <Select
                        label="Category"
                        options={categories}
                        value={category}
                        onChange={(e) => setCategory(e.target.value)}
                        required
                      />
                    </>
                  ) : (
                    <Input
                      label="Team Join Code"
                      type="text"
                      placeholder="e.g. A1B2C3"
                      value={joinCode}
                      onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                      required
                      className="uppercase placeholder:normal-case"
                      maxLength={6}
                    />
                  )}

                  <Input
                    label="Registration Number"
                    type="text"
                    placeholder="e.g. REG-12345"
                    value={emailPrefix}
                    onChange={(e) => setEmailPrefix(e.target.value)}
                    required
                  />
                  
                  
                  
                  <Button type="submit" className="w-full" isLoading={isLoading}>
                    {role === 'leader' ? 'CREATE TEAM' : 'JOIN TEAM'}
                  </Button>
                </form>
              </CardContent>
            </>
          )}

          {step === 3 && (
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}>
              <CardHeader className="text-center pb-2">
                <div className="mx-auto w-16 h-16 bg-green-500/10 rounded-full flex items-center justify-center mb-4">
                  <CheckCircle2 className="w-8 h-8 text-green-400" />
                </div>
                <h1 className="text-2xl font-space-grotesk font-bold tracking-wide text-green-400">Team Created!</h1>
                <p className="text-gray-400 mt-2">Your team has been successfully registered.</p>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="bg-black/50 p-6 rounded-lg border border-purple-500/30 text-center">
                  <p className="text-sm text-gray-400 mb-3">Share this invite code with your 3 team members:</p>
                  <div className="flex items-center justify-center gap-3">
                    <div className="text-4xl font-space-grotesk font-black tracking-widest text-white">
                      {generatedCode}
                    </div>
                    <Button variant="ghost" size="sm" onClick={copyCode} className="hover:bg-white/10">
                      {copied ? <CheckCircle2 className="w-5 h-5 text-green-400" /> : <Copy className="w-5 h-5" />}
                    </Button>
                  </div>
                </div>
                <Button onClick={() => router.push('/dashboard')} className="w-full h-12 text-lg">
                  GO TO DASHBOARD
                </Button>
              </CardContent>
            </motion.div>
          )}
        </Card>
      </motion.div>
    </div>
  );
}
