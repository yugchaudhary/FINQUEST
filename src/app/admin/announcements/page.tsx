'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { getAnnouncements, publishAnnouncement, deleteAnnouncement } from '@/app/actions/announcements';
import { Megaphone, Loader2, Trash2, AlertCircle, CheckCircle2 } from 'lucide-react';

export default function AnnouncementsPage() {
  const [announcements, setAnnouncements] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [content, setContent] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const fetchAnnouncements = async () => {
    setIsLoading(true);
    const res = await getAnnouncements();
    if (res.success && res.data) {
      setAnnouncements(res.data);
    } else if (res.error) {
      setError(res.error);
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
    setError(null);
    setSuccess(null);

    const res = await publishAnnouncement(content.trim());
    if (!res?.success) {
      setError(res?.error || 'Failed to publish announcement');
    } else {
      setContent('');
      setSuccess('Announcement published live to all participant dashboards!');
      await fetchAnnouncements();
    }
    setIsSubmitting(false);
  };

  const handleDelete = async (id: string) => {
    setDeletingId(id);
    setError(null);
    setSuccess(null);

    const res = await deleteAnnouncement(id);
    if (!res?.success) {
      setError(res?.error || 'Failed to delete announcement');
    } else {
      setSuccess('Announcement deleted successfully.');
      await fetchAnnouncements();
    }
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

      {error && (
        <div className="p-3.5 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-sm flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {success && (
        <div className="p-3.5 rounded-lg bg-green-500/10 border border-green-500/30 text-green-400 text-sm flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{success}</span>
        </div>
      )}

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
                <div key={a.id} className="p-4 rounded-lg bg-surface border border-border flex justify-between items-start gap-4">
                  <div className="flex-1 min-w-0">
                    <p className="text-foreground text-lg mb-2 break-words">{a.content}</p>
                    <p className="text-xs text-slate-500 font-mono">
                      Published on {new Intl.DateTimeFormat('en-US', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(a.published_at || a.created_at || Date.now()))}
                    </p>
                  </div>
                  <Button 
                    variant="destructive" 
                    size="sm" 
                    className="bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/30 flex items-center gap-1.5 font-bold text-xs shrink-0"
                    onClick={() => handleDelete(a.id)}
                    disabled={deletingId === a.id}
                  >
                    {deletingId === a.id ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Trash2 className="w-3.5 h-3.5" />
                    )}
                    Delete
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
