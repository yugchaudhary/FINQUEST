import React from 'react';
import { Megaphone } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface AnnouncementsBannerProps {
  announcements: any[];
}

export function AnnouncementsBanner({ announcements }: AnnouncementsBannerProps) {
  if (!announcements || announcements.length === 0) return null;

  return (
    <div className="w-full space-y-2 mb-6">
      <AnimatePresence>
        {announcements.map((a) => (
          <motion.div
            key={a.id}
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="w-full bg-blue-500/10 border border-blue-500/30 text-blue-100 p-4 rounded-lg flex items-start gap-3 shadow-[0_0_15px_rgba(59,130,246,0.15)]"
          >
            <Megaphone className="w-5 h-5 text-blue-400 mt-0.5 flex-shrink-0" />
            <div className="flex-1">
              <p className="font-medium text-sm md:text-base">{a.content}</p>
            </div>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
