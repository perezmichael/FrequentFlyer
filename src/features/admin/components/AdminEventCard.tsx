'use client';

import { useState, useRef } from 'react';
import { Event } from '@/features/frequent-flyer/data/events';
import { updateEvent, uploadEventFlyer } from '@/app/actions';
import { VIBES, VIBE_KEYS } from '@/features/frequent-flyer/data/vibes';
import { Card, CardContent, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Check, X, Edit2, Save, XCircle, Upload, AlertTriangle, ImageOff } from 'lucide-react';

interface AdminEventCardProps {
    event: Event & { status?: string; vibe_score?: number };
    source?: string;
    selected?: boolean;
    focused?: boolean;
    duplicate?: boolean;
    missingFlyer?: boolean;
    onToggleSelect?: () => void;
    onApprove?: () => void;
    onReject?: () => void;
    onFocus?: () => void;
}

// Short label + color per source
const SOURCE_STYLE: Record<string, { label: string; className: string }> = {
    master_scout: { label: 'Scout', className: 'bg-indigo-500/90 text-white' },
    eventbrite: { label: 'Eventbrite', className: 'bg-orange-500/90 text-white' },
    resident_advisor: { label: 'RA', className: 'bg-red-500/90 text-white' },
    ra: { label: 'RA', className: 'bg-red-500/90 text-white' },
    manual: { label: 'Manual', className: 'bg-black/80 text-white' },
};

export default function AdminEventCard({
    event,
    source,
    selected = false,
    focused = false,
    duplicate = false,
    missingFlyer = false,
    onToggleSelect,
    onApprove,
    onReject,
    onFocus,
}: AdminEventCardProps) {
    const [isEditing, setIsEditing] = useState(false);
    const [formData, setFormData] = useState({
        title: event.title,
        date: event.date,
        location: event.location,
        image: event.image,
        vibe: (event.vibe && event.vibe[0]) || ''
    });
    const [uploading, setUploading] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleFlyerUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        setUploading(true);
        try {
            const reader = new FileReader();
            reader.onload = async (ev) => {
                const base64 = ev.target?.result as string;
                const result = await uploadEventFlyer(event.id, base64);
                setFormData(prev => ({ ...prev, image: result.url }));
                setUploading(false);
            };
            reader.readAsDataURL(file);
        } catch {
            setUploading(false);
        }
        e.target.value = '';
    };

    const handleSave = async () => {
        await updateEvent(event.id, {
            event_name: formData.title,
            event_date: formData.date,
            flyer_url: formData.image,
            event_vibe: formData.vibe
        });
        setIsEditing(false);
    };

    const inputClass = "flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50";

    const sourceStyle = source ? SOURCE_STYLE[source] ?? { label: source, className: 'bg-gray-500/90 text-white' } : null;

    return (
        <Card
            data-admin-card-id={event.id}
            onClick={onFocus}
            className={`overflow-hidden transition-all duration-200 hover:shadow-md cursor-pointer
                ${event.status === 'approved' ? 'border-green-500/50' : ''}
                ${focused ? 'ring-2 ring-blue-500 ring-offset-2' : ''}
                ${selected ? 'ring-2 ring-black ring-offset-2 bg-black/5' : ''}
            `}
        >
            {/* Image Header */}
            <div className="relative aspect-video w-full overflow-hidden bg-muted group">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                    src={formData.image || '/placeholder.jpg'}
                    alt={formData.title}
                    className="w-full h-full object-cover transition-transform duration-500 hover:scale-105"
                />

                {/* Selection checkbox — always visible */}
                {onToggleSelect && (
                    <button
                        onClick={e => {
                            e.stopPropagation();
                            onToggleSelect();
                        }}
                        className={`absolute top-2 right-2 w-6 h-6 rounded-md border-2 flex items-center justify-center transition-colors backdrop-blur-md shadow-sm
                            ${selected
                                ? 'bg-black border-black text-[#FFFAEB]'
                                : 'bg-white/80 border-white/90 hover:border-black text-transparent hover:text-black/40'
                            }
                        `}
                        aria-label={selected ? 'Deselect' : 'Select'}
                    >
                        <Check className="w-3.5 h-3.5" />
                    </button>
                )}

                {/* Upload overlay */}
                <button
                    onClick={e => {
                        e.stopPropagation();
                        fileInputRef.current?.click();
                    }}
                    disabled={uploading}
                    className="absolute bottom-2 right-2 flex items-center gap-1.5 px-2.5 py-1.5 rounded-md bg-black/60 text-white text-xs font-medium backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-opacity hover:bg-black/80 disabled:cursor-not-allowed"
                >
                    <Upload className="w-3 h-3" />
                    {uploading ? 'Uploading…' : 'Upload flyer'}
                </button>
                <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleFlyerUpload}
                    onClick={e => e.stopPropagation()}
                />

                {/* Top-left badge stack */}
                <div className="absolute top-2 left-2 flex flex-wrap gap-1.5 max-w-[calc(100%-48px)]">
                    <Badge variant={event.status === 'approved' ? 'default' : 'secondary'} className="shadow-lg backdrop-blur-md">
                        {event.status || 'pending'}
                    </Badge>
                    {event.vibe_score ? (
                        <Badge variant="outline" className="bg-black/50 text-white border-none backdrop-blur-md">
                            {event.vibe_score}/10
                        </Badge>
                    ) : null}
                    {sourceStyle && (
                        <Badge className={`border-none backdrop-blur-md ${sourceStyle.className}`}>
                            {sourceStyle.label}
                        </Badge>
                    )}
                </div>

                {/* Bottom-left warning badges */}
                {(duplicate || missingFlyer) && (
                    <div className="absolute bottom-2 left-2 flex gap-1.5">
                        {duplicate && (
                            <Badge className="bg-amber-500/95 text-white border-none backdrop-blur-md inline-flex items-center gap-1">
                                <AlertTriangle className="w-3 h-3" />
                                Dupe
                            </Badge>
                        )}
                        {missingFlyer && (
                            <Badge className="bg-rose-500/95 text-white border-none backdrop-blur-md inline-flex items-center gap-1">
                                <ImageOff className="w-3 h-3" />
                                No flyer
                            </Badge>
                        )}
                    </div>
                )}
            </div>

            <CardContent className="p-4 space-y-3">
                {isEditing ? (
                    <div className="space-y-3 pt-2" onClick={e => e.stopPropagation()}>
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
                            <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 shrink-0"
                                onClick={e => {
                                    e.stopPropagation();
                                    setIsEditing(true);
                                }}
                            >
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
                        onClick={e => {
                            e.stopPropagation();
                            onApprove?.();
                        }}
                        className="flex-1 bg-green-600 hover:bg-green-700 text-white"
                        size="sm"
                        disabled={event.status === 'approved'}
                    >
                        <Check className="w-4 h-4 mr-2" />
                        Approve
                    </Button>
                    <Button
                        onClick={e => {
                            e.stopPropagation();
                            onReject?.();
                        }}
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
