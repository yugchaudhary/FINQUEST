'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { getAnnouncements, publishAnnouncement, deleteAnnouncement } from '@/app/actions/announcements';
import { Megaphone, Loader2, Trash2 } from 'lucide-react';


export default function AnnouncementsPage() {
  const [announcements, setAnnouncements] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [content, setContent] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const fetchAnnouncements = async () => {
    setIsLoading(true);
    const res = await getAnnouncements();
    if (res.success && res.data) {
      setAnnouncements(res.data);
    }
    setIsLoading(false);
  };

  useEffect(() => {
    fetchAnnouncements();
  }, []);

  const handlePublish = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim()) return;
    setIsSubmitting(true);
    await publishAnnouncement(content);
    setContent('');
    await fetchAnnouncements();
    setIsSubmitting(false);
  };

  const handleDelete = async (id: string) => {
    setDeletingId(id);
    await deleteAnnouncement(id);
    await fetchAnnouncements();
    setDeletingId(null);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-space-grotesk font-bold tracking-tight flex items-center gap-2">
            <Megaphone className="text-purple-500" />
            Announcements
          </h1>
          <p className="text-slate-500 mt-1">Broadcast realtime announcements to all participant dashboards.</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <form onSubmit={handlePublish} className="flex gap-4 items-end">
            <div className="flex-1">
              <Input
                label="New Announcement"
                placeholder="Type your message here..."
                value={content}
                onChange={(e) => setContent(e.target.value)}
                required
              />
            </div>
            <Button type="submit" isLoading={isSubmitting}>Publish Live</Button>
          </form>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-purple-500" />
            </div>
          ) : announcements.length === 0 ? (
            <div className="text-center py-12 text-slate-500">
              No announcements published yet.
            </div>
          ) : (
            <div className="space-y-4">
              {announcements.map((a) => (
                <div key={a.id} className="p-4 rounded-lg bg-surface border border-border flex justify-between items-start">
                  <div>
                    <p className="text-foreground text-lg mb-2">{a.content}</p>
                    <p className="text-xs text-slate-500">
                      Published on {new Intl.DateTimeFormat('en-US', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(a.published_at))}
                    </p>
                  </div>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="text-red-400 hover:text-red-300 hover:bg-red-500/10"
                    onClick={() => handleDelete(a.id)}
                    isLoading={deletingId === a.id}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
