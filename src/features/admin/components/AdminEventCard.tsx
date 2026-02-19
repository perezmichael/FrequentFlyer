'use client';

import { useState } from 'react';
import { Event } from '@/features/frequent-flyer/data/events';
import { approveEvent, rejectEvent, updateEvent } from '@/app/actions';
import { VIBES, VIBE_KEYS } from '@/features/frequent-flyer/data/vibes';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'; // Not strictly needed but available
import { Check, X, Edit2, Save, XCircle } from 'lucide-react'; // Assuming lucide-react is installed, if not will fallback to text

interface AdminEventCardProps {
    event: Event & { status?: string, vibe_score?: number };
}

export default function AdminEventCard({ event }: AdminEventCardProps) {
    const [isEditing, setIsEditing] = useState(false);
    const [formData, setFormData] = useState({
        title: event.title,
        date: event.date,
        location: event.location,
        image: event.image,
        vibe: (event.vibe && event.vibe[0]) || ''
    });

    const handleSave = async () => {
        await updateEvent(event.id, {
            event_name: formData.title,
            event_date: formData.date,
            flyer_url: formData.image,
            event_vibe: formData.vibe
        });
        setIsEditing(false);
    };

    const handleApprove = async () => {
        if (confirm(`Approve "${event.title}"?`)) {
            await approveEvent(event.id);
        }
    };

    const handleReject = async () => {
        if (confirm(`Reject "${event.title}"?`)) {
            await rejectEvent(event.id);
        }
    };

    const inputClass = "flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50";

    return (
        <Card className={`overflow-hidden transition-all duration-200 hover:shadow-md ${event.status === 'approved' ? 'border-green-500/50' : ''}`}>
            {/* Image Header */}
            <div className="relative aspect-video w-full overflow-hidden bg-muted">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                    src={formData.image || '/placeholder.jpg'}
                    alt={formData.title}
                    className="w-full h-full object-cover transition-transform duration-500 hover:scale-105"
                />
                <div className="absolute top-2 left-2 flex gap-2">
                    <Badge variant={event.status === 'approved' ? 'default' : 'secondary'} className="shadow-lg backdrop-blur-md">
                        {event.status || 'pending'}
                    </Badge>
                    {event.vibe_score && (
                        <Badge variant="outline" className="bg-black/50 text-white border-none backdrop-blur-md">
                            {event.vibe_score}/10
                        </Badge>
                    )}
                </div>
            </div>

            <CardContent className="p-4 space-y-3">
                {isEditing ? (
                    <div className="space-y-3 pt-2">
                        <div className="space-y-1">
                            <label className="text-xs font-medium text-muted-foreground">Title</label>
                            <input
                                value={formData.title}
                                onChange={e => setFormData({ ...formData, title: e.target.value })}
                                className={inputClass}
                            />
                        </div>
                        <div className="space-y-1">
                            <label className="text-xs font-medium text-muted-foreground">Date</label>
                            <input
                                value={formData.date}
                                onChange={e => setFormData({ ...formData, date: e.target.value })}
                                className={inputClass}
                            />
                        </div>
                        <div className="space-y-1">
                            <label className="text-xs font-medium text-muted-foreground">Image URL</label>
                            <input
                                value={formData.image}
                                onChange={e => setFormData({ ...formData, image: e.target.value })}
                                className={inputClass}
                                placeholder="https://..."
                            />
                        </div>
                        <div className="space-y-1">
                            <label className="text-xs font-medium text-muted-foreground">Vibe</label>
                            <select
                                value={formData.vibe}
                                onChange={e => setFormData({ ...formData, vibe: e.target.value })}
                                className={inputClass}
                            >
                                <option value="">Select Vibe...</option>
                                {VIBE_KEYS.map(key => (
                                    <option key={key} value={key}>
                                        {VIBES[key]}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div className="flex gap-2 pt-2">
                            <Button size="sm" onClick={handleSave} className="flex-1">
                                <Save className="w-3 h-3 mr-2" />
                                Save
                            </Button>
                            <Button size="sm" variant="outline" onClick={() => setIsEditing(false)} className="flex-1">
                                <XCircle className="w-3 h-3 mr-2" />
                                Cancel
                            </Button>
                        </div>
                    </div>
                ) : (
                    <>
                        <div className="flex justify-between items-start gap-2">
                            <div>
                                <h3 className="font-semibold text-lg leading-tight line-clamp-1">{event.title}</h3>
                                <p className="text-sm text-muted-foreground line-clamp-1">{event.location}</p>
                            </div>
                            <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={() => setIsEditing(true)}>
                                <Edit2 className="w-3.5 h-3.5" />
                            </Button>
                        </div>

                        <div className="flex items-center text-xs text-muted-foreground">
                            <span>{new Date(event.date).toLocaleDateString()}</span>
                            <span className="mx-2">•</span>
                            <span>{new Date(event.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                        </div>

                        {event.vibe && event.vibe.length > 0 && (
                            <div className="flex flex-wrap gap-1 pt-1">
                                {event.vibe.map(v => (
                                    <Badge key={v} variant="secondary" className="text-[10px] px-1.5 h-5">
                                        {v}
                                    </Badge>
                                ))}
                            </div>
                        )}
                    </>
                )}
            </CardContent>

            {!isEditing && (
                <CardFooter className="p-4 pt-0 gap-2">
                    <Button
                        onClick={handleApprove}
                        className="flex-1 bg-green-600 hover:bg-green-700 text-white"
                        size="sm"
                        disabled={event.status === 'approved'}
                    >
                        <Check className="w-4 h-4 mr-2" />
                        Approve
                    </Button>
                    <Button
                        onClick={handleReject}
                        variant="destructive"
                        className="flex-1"
                        size="sm"
                        disabled={event.status === 'rejected'}
                    >
                        <X className="w-4 h-4 mr-2" />
                        Dismiss
                    </Button>
                </CardFooter>
            )}
        </Card>
    );
}
