'use client';

import { useState } from 'react';
import { RecurringEvent, DAY_NAMES, formatRecurringSchedule } from '@/features/frequent-flyer/data/recurringEvents';
import { RECURRING_CATEGORIES, RECURRING_CATEGORY_KEYS } from '@/features/frequent-flyer/data/recurringCategories';
import { approveRecurringEvent, rejectRecurringEvent, updateRecurringEvent } from '@/app/actions';
import { getVibePlaceholder, hasRealImage } from '@/features/frequent-flyer/data/vibePlaceholders';
import { Card, CardContent, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Check, X, Edit2, Save, XCircle } from 'lucide-react';

interface AdminRecurringEventCardProps {
    event: RecurringEvent & { status: string };
}

export default function AdminRecurringEventCard({ event }: AdminRecurringEventCardProps) {
    const [isEditing, setIsEditing] = useState(false);
    const [formData, setFormData] = useState({
        event_name: event.event_name,
        category: event.category,
        day_of_week: event.day_of_week,
        start_time: event.start_time || '',
        end_time: event.end_time || '',
        description: event.description || '',
    });

    const placeholder = getVibePlaceholder(event.category);
    const showImage = hasRealImage(event.venue_image);

    const handleSave = async () => {
        await updateRecurringEvent(event.id, {
            event_name: formData.event_name,
            category: formData.category,
            day_of_week: Number(formData.day_of_week),
            start_time: formData.start_time || null,
            end_time: formData.end_time || null,
            description: formData.description || null,
        });
        setIsEditing(false);
    };

    const handleApprove = async () => {
        if (confirm(`Approve "${event.event_name}"?`)) {
            await approveRecurringEvent(event.id);
        }
    };

    const handleReject = async () => {
        if (confirm(`Reject "${event.event_name}"?`)) {
            await rejectRecurringEvent(event.id);
        }
    };

    const inputClass = "flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring";

    return (
        <Card className={`overflow-hidden transition-all duration-200 hover:shadow-md ${event.status === 'approved' ? 'border-green-500/50' : ''}`}>
            {/* Image / Placeholder Header */}
            <div className="relative aspect-video w-full overflow-hidden bg-muted">
                {showImage ? (
                    /* eslint-disable-next-line @next/next/no-img-element */
                    <img
                        src={event.venue_image!}
                        alt={event.venue_name}
                        className="w-full h-full object-cover"
                    />
                ) : (
                    <div
                        className="w-full h-full flex flex-col items-center justify-center gap-1"
                        style={{ background: placeholder.bg }}
                    >
                        <span style={{ fontSize: '2.5rem', lineHeight: 1 }}>{placeholder.emoji}</span>
                        <span style={{ fontSize: '0.75rem', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.9)' }}>
                            {event.category}
                        </span>
                    </div>
                )}
                <div className="absolute top-2 left-2 flex gap-2">
                    <Badge variant={event.status === 'approved' ? 'default' : 'secondary'} className="shadow-lg backdrop-blur-md">
                        {event.status}
                    </Badge>
                    <Badge variant="outline" className="bg-black/50 text-white border-none backdrop-blur-md">
                        {RECURRING_CATEGORIES[event.category] || event.category}
                    </Badge>
                </div>
            </div>

            <CardContent className="p-4 space-y-3">
                {isEditing ? (
                    <div className="space-y-3 pt-2">
                        <div className="space-y-1">
                            <label className="text-xs font-medium text-muted-foreground">Name</label>
                            <input
                                value={formData.event_name}
                                onChange={e => setFormData({ ...formData, event_name: e.target.value })}
                                className={inputClass}
                            />
                        </div>
                        <div className="space-y-1">
                            <label className="text-xs font-medium text-muted-foreground">Category</label>
                            <select
                                value={formData.category}
                                onChange={e => setFormData({ ...formData, category: e.target.value })}
                                className={inputClass}
                            >
                                {RECURRING_CATEGORY_KEYS.map(key => (
                                    <option key={key} value={key}>
                                        {RECURRING_CATEGORIES[key]}
                                    </option>
                                ))}
                            </select>
                        </div>
                        <div className="space-y-1">
                            <label className="text-xs font-medium text-muted-foreground">Day of Week</label>
                            <select
                                value={formData.day_of_week}
                                onChange={e => setFormData({ ...formData, day_of_week: Number(e.target.value) })}
                                className={inputClass}
                            >
                                {DAY_NAMES.map((name, i) => (
                                    <option key={i} value={i}>{name}</option>
                                ))}
                            </select>
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                            <div className="space-y-1">
                                <label className="text-xs font-medium text-muted-foreground">Start Time</label>
                                <input
                                    type="time"
                                    value={formData.start_time}
                                    onChange={e => setFormData({ ...formData, start_time: e.target.value })}
                                    className={inputClass}
                                />
                            </div>
                            <div className="space-y-1">
                                <label className="text-xs font-medium text-muted-foreground">End Time</label>
                                <input
                                    type="time"
                                    value={formData.end_time}
                                    onChange={e => setFormData({ ...formData, end_time: e.target.value })}
                                    className={inputClass}
                                />
                            </div>
                        </div>
                        <div className="space-y-1">
                            <label className="text-xs font-medium text-muted-foreground">Description</label>
                            <textarea
                                value={formData.description}
                                onChange={e => setFormData({ ...formData, description: e.target.value })}
                                className={`${inputClass} h-20 resize-none`}
                            />
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
                                <h3 className="font-semibold text-lg leading-tight line-clamp-1">{event.event_name}</h3>
                                <p className="text-sm text-muted-foreground line-clamp-1">{event.venue_name}, {event.neighborhood}</p>
                            </div>
                            <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={() => setIsEditing(true)}>
                                <Edit2 className="w-3.5 h-3.5" />
                            </Button>
                        </div>

                        <div className="text-xs text-muted-foreground">
                            {formatRecurringSchedule(event.day_of_week, event.start_time, event.end_time)}
                        </div>

                        {event.description && (
                            <p className="text-sm text-muted-foreground line-clamp-2">{event.description}</p>
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
