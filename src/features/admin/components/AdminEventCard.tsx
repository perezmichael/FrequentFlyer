'use client';

import { useState } from 'react';
import { Event } from '@/features/frequent-flyer/data/events'; // Reuse Type
import styles from '@/features/frequent-flyer/components/EventCard.module.css'; // Reuse styles
import { approveEvent, rejectEvent, updateEvent } from '@/app/actions';

interface AdminEventCardProps {
    event: Event & { status?: string, vibe_score?: number };
}

export default function AdminEventCard({ event }: AdminEventCardProps) {
    const [isEditing, setIsEditing] = useState(false);
    const [formData, setFormData] = useState({
        title: event.title,
        date: event.date,
        location: event.location,
        image: event.image
    });

    const handleSave = async () => {
        // Optimistic update could go here
        await updateEvent(event.id, {
            event_name: formData.title,
            event_date: formData.date,
            flyer_url: formData.image
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

    return (
        <div className={styles.card} style={{ border: event.status === 'approved' ? '2px solid #4caf50' : '1px solid #ccc', padding: '10px' }}>
            <div className={styles.imageContainer}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={formData.image} alt={formData.title} className={styles.image} />
                <span style={{
                    position: 'absolute', top: 10, left: 10,
                    background: 'black', color: 'white', padding: '4px 8px', borderRadius: 4, fontWeight: 'bold'
                }}>
                    {event.vibe_score ? `${event.vibe_score}/10` : '?'}
                </span>
            </div>

            <div className={styles.content}>
                {isEditing ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                        <input
                            value={formData.title}
                            onChange={e => setFormData({ ...formData, title: e.target.value })}
                            className="border p-1 rounded"
                        />
                        <input
                            value={formData.date}
                            onChange={e => setFormData({ ...formData, date: e.target.value })}
                            className="border p-1 rounded"
                        />
                        <input
                            value={formData.image}
                            onChange={e => setFormData({ ...formData, image: e.target.value })}
                            placeholder="Image URL"
                            className="border p-1 rounded"
                        />
                        <div style={{ display: 'flex', gap: 4 }}>
                            <button onClick={handleSave} className="bg-blue-500 text-white px-2 py-1 rounded">Save</button>
                            <button onClick={() => setIsEditing(false)} className="text-gray-500 px-2 py-1">Cancel</button>
                        </div>
                    </div>
                ) : (
                    <>
                        <div className={styles.header}>
                            <h3 className={styles.title}>{event.title}</h3>
                            <button onClick={() => setIsEditing(true)} className="text-xs text-blue-500 underline">Edit</button>
                        </div>
                        <div className={styles.info}>{event.location}</div>
                        <div className={styles.info}>{new Date(event.date).toLocaleString()}</div>
                    </>
                )}

                <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
                    <button
                        onClick={handleApprove}
                        className="flex-1 bg-green-600 text-white py-2 rounded font-bold hover:bg-green-700 transition"
                    >
                        Approve
                    </button>
                    <button
                        onClick={handleReject}
                        className="flex-1 bg-red-500 text-white py-2 rounded font-bold hover:bg-red-600 transition"
                    >
                        Dismiss
                    </button>
                </div>
            </div>
        </div>
    );
}
