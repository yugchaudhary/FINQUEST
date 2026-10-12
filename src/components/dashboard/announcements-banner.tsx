import React, { useEffect, useState } from 'react';
import { Megaphone, Bell } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

interface AnnouncementsBannerProps {
  announcements: any[];
}

export function AnnouncementsBanner({ announcements }: AnnouncementsBannerProps) {
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 10000);
    return () => clearInterval(interval);
  }, []);

  if (!announcements || announcements.length === 0) {
    return (
      <div className="w-full pt-8">
        <div className="text-xs font-bold text-slate-500 tracking-widest mb-4 ml-1">EVENT UPDATES</div>
        <Card className="w-full bg-surface border-border">
          <CardContent className="flex flex-col items-center justify-center py-10 text-slate-500">
            <Bell className="w-8 h-8 mb-3 opacity-30" />
            <p className="text-sm">No updates from the Admin yet.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="w-full pt-8">
      <div className="text-xs font-bold text-slate-500 tracking-widest mb-4 ml-1">EVENT UPDATES</div>
      <div className="w-full flex flex-col gap-3">
        <AnimatePresence initial={false}>
          {announcements.map((a) => {
            const rawDate = a.published_at || a.created_at;
            const dateObj = rawDate ? new Date(rawDate) : new Date();
            const timestamp = isNaN(dateObj.getTime()) ? Date.now() : dateObj.getTime();
            const isNew = now - timestamp < 60000; // less than 60s old
            
            return (
              <motion.div
                key={a.id}
                initial={{ opacity: 0, height: 0, scale: 0.95 }}
                animate={{ opacity: 1, height: 'auto', scale: 1 }}
                exit={{ opacity: 0, scale: 0.95, height: 0 }}
                transition={{ duration: 0.3 }}
                className="overflow-hidden"
              >
                <div className={`
                  w-full rounded-xl p-5 md:p-6 flex flex-col sm:flex-row items-start gap-4 border 
                  ${isNew 
                    ? 'bg-blue-900/20 border-blue-500/50 shadow-[0_0_20px_rgba(59,130,246,0.15)]' 
                    : 'bg-surface border-border hover:bg-[#1a1a24]'} 
                  transition-colors
                `}>
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 border ${isNew ? 'bg-blue-500/20 border-blue-500/30' : 'bg-black/30 border-border'}`}>
                    <Megaphone className={`w-5 h-5 ${isNew ? 'text-blue-400' : 'text-slate-500'}`} />
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      {isNew && (
                        <Badge variant="outline" className="bg-blue-500/10 text-blue-400 border-blue-500/30 text-[10px] px-1.5 py-0">
                          NEW
                        </Badge>
                      )}
                      <span className="text-xs text-slate-500 font-mono">
                        {dateObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    <p className={`text-base ${isNew ? 'text-blue-50 font-medium' : 'text-slate-600'}`}>
                      {a.content}
                    </p>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </div>
  );
}
