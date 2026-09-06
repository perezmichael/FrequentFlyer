'use client';

import { useState } from 'react';
import { updateVenue, geocodeVenue, setVenueVerified } from '@/app/actions';

export type AdminVenue = {
    id: string;
    name: string;
    neighborhood: string;
    address: string;
    url: string;
    instagram_handle: string;
    lat: number | null;
    lng: number | null;
    upcoming: number;
    /** false only for venues someone created through the public form and that
     *  nobody has vouched for yet. Venues predating the flag carry undefined. */
    verified?: boolean;
    /** What the submitter typed. Deliberately not the venue's address until
     *  you promote it — see submitEvent. */
    submittedAddress?: string | null;
    /** Existing venues with a similar name, so a duplicate gets caught at
     *  review time rather than becoming a second row for the same room. */
    similar?: { id: string; name: string; neighborhood: string }[];
};

const FIELDS = [
    { key: 'name', label: 'Name', placeholder: 'Ye Rustic Inn' },
    { key: 'neighborhood', label: 'Neighborhood', placeholder: 'Los Feliz' },
    { key: 'address', label: 'Address', placeholder: '1831 Hillhurst Ave, Los Angeles, CA 90027' },
    { key: 'url', label: 'Website', placeholder: 'https://…' },
    { key: 'instagram_handle', label: 'Instagram', placeholder: '@handle' },
] as const;

function Row({ venue }: { venue: AdminVenue }) {
    const [draft, setDraft] = useState(venue);
    const [saving, setSaving] = useState(false);
    const [saved, setSaved] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [geocoding, setGeocoding] = useState(false);
    const [geocodeNote, setGeocodeNote] = useState<string | null>(null);
    const [verifying, setVerifying] = useState(false);
    const [verified, setVerified] = useState(venue.verified);

    const dirty =
        FIELDS.some(f => draft[f.key] !== venue[f.key]) ||
        String(draft.lat ?? '') !== String(venue.lat ?? '') ||
        String(draft.lng ?? '') !== String(venue.lng ?? '');

    async function save() {
        setSaving(true); setError(null);
        try {
            await updateVenue(venue.id, {
                ...Object.fromEntries(FIELDS.map(f => [f.key, draft[f.key]])),
                // Sent as strings; the action parses and enforces that both
                // move together, since half a coordinate puts a pin in the sea.
                lat: draft.lat === null || draft.lat === ('' as any) ? null : draft.lat,
                lng: draft.lng === null || draft.lng === ('' as any) ? null : draft.lng,
            });
            setSaved(true);
            setTimeout(() => setSaved(false), 2000);
        } catch (e: any) {
            setError(e?.message || 'Save failed');
        } finally {
            setSaving(false);
        }
    }

    /** Ask Nominatim, fill the boxes, save nothing. The proposal is shown so it
     *  can be rejected — the point of the flow is that a coordinate is never
     *  written without someone looking at it. */
    async function findCoordinates() {
        setGeocoding(true); setGeocodeNote(null); setError(null);
        const query = [draft.address || draft.submittedAddress || draft.name, draft.neighborhood, 'Los Angeles, CA']
            .filter(Boolean).join(', ');
        try {
            const res = await geocodeVenue(query);
            if (res.ok) {
                setDraft(d => ({ ...d, lat: res.lat as any, lng: res.lng as any }));
                setGeocodeNote(`Proposed from “${res.label}” — check it, then save.`);
            } else {
                setGeocodeNote(res.reason);
            }
        } catch (e: any) {
            setGeocodeNote(e?.message || 'Lookup failed');
        } finally {
            setGeocoding(false);
        }
    }

    async function toggleVerified() {
        setVerifying(true); setError(null);
        try {
            const res = await setVenueVerified(venue.id, !verified);
            setVerified(res.verified);
        } catch (e: any) {
            setError(e?.message || 'Could not update');
        } finally {
            setVerifying(false);
        }
    }

    const noPin = draft.lat == null || draft.lng == null;

    return (
        <div className={`border-b border-black/10 px-4 py-4 ${verified === false ? 'bg-[#C2371B]/[0.04]' : ''}`}>
            <div className="mb-2 flex flex-wrap items-center gap-3">
                <span className="font-space-mono text-[11px] uppercase tracking-[-0.44px] text-black/45">
                    {venue.upcoming > 0 ? `${venue.upcoming} upcoming` : 'nothing upcoming'}
                </span>
                {verified === false && (
                    <span className="rounded-full bg-[#C2371B] px-2 py-0.5 font-space-mono text-[10px] font-bold uppercase tracking-[-0.44px] text-[#FFFAEB]">
                        submitted · not in the picker yet
                    </span>
                )}
                {noPin && (
                    <span className="rounded-full border border-[#C2371B] px-2 py-0.5 font-space-mono text-[10px] font-bold uppercase tracking-[-0.44px] text-[#C2371B]">
                        no pin — hidden from the map
                    </span>
                )}
                {!draft.neighborhood && (
                    <span className="rounded-full border border-black/30 px-2 py-0.5 font-space-mono text-[10px] uppercase tracking-[-0.44px] text-black/50">
                        no neighborhood
                    </span>
                )}
            </div>

            {/* A claim from the submitter, shown as theirs and not as ours until
                it is copied into the real field. */}
            {draft.submittedAddress && draft.submittedAddress !== draft.address && (
                <div className="mb-2 rounded-md border border-[#C2371B]/30 bg-[#C2371B]/[0.06] px-3 py-2">
                    <p className="font-space-mono text-[11px] uppercase tracking-[-0.44px] text-black/55">
                        submitter says
                    </p>
                    <p className="mt-0.5 text-[13px]">{draft.submittedAddress}</p>
                    <button
                        onClick={() => setDraft(d => ({ ...d, address: d.submittedAddress || '' }))}
                        className="mt-1.5 rounded-full border border-[#C2371B] px-2.5 py-0.5 font-space-mono text-[10px] uppercase tracking-[-0.44px] text-[#C2371B] transition-colors hover:bg-[#C2371B] hover:text-[#FFFAEB]"
                    >
                        use as the address
                    </button>
                </div>
            )}

            {/* The likelier failure than a wrong address is a second row for a
                room you already have. */}
            {verified === false && draft.similar && draft.similar.length > 0 && (
                <div className="mb-2 rounded-md border border-amber-500/40 bg-amber-500/[0.08] px-3 py-2">
                    <p className="font-space-mono text-[11px] uppercase tracking-[-0.44px] text-black/55">
                        possible duplicate of
                    </p>
                    <p className="mt-0.5 text-[13px]">
                        {draft.similar.map(s => `${s.name}${s.neighborhood ? ` (${s.neighborhood})` : ''}`).join(' · ')}
                    </p>
                    <p className="mt-1 font-space-mono text-[10px] leading-[1.5] text-black/45">
                        If it&apos;s the same room, repoint the event at the existing venue and delete this one.
                    </p>
                </div>
            )}

            <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
                {FIELDS.map(f => (
                    <label key={f.key} className="block">
                        <span className="font-space-mono text-[10px] uppercase tracking-[-0.44px] text-black/45">
                            {f.label}
                        </span>
                        <input
                            value={draft[f.key] as string}
                            placeholder={f.placeholder}
                            onChange={e => setDraft({ ...draft, [f.key]: e.target.value })}
                            className="mt-0.5 w-full rounded-md border border-black/15 bg-transparent px-2.5 py-1.5 text-[13px] placeholder:text-black/25 focus:border-[#C2371B] focus:outline-none"
                        />
                    </label>
                ))}

                <div className="flex gap-2">
                    {(['lat', 'lng'] as const).map(k => (
                        <label key={k} className="block flex-1">
                            <span className="font-space-mono text-[10px] uppercase tracking-[-0.44px] text-black/45">
                                {k}
                            </span>
                            <input
                                value={draft[k] ?? ''}
                                placeholder={k === 'lat' ? '34.10435' : '-118.28779'}
                                onChange={e => setDraft({ ...draft, [k]: e.target.value as any })}
                                className="mt-0.5 w-full rounded-md border border-black/15 bg-transparent px-2.5 py-1.5 font-space-mono text-[12px] placeholder:text-black/25 focus:border-[#C2371B] focus:outline-none"
                            />
                        </label>
                    ))}
                </div>
            </div>

            <div className="mt-2 flex items-center gap-3">
                <button
                    onClick={save}
                    disabled={!dirty || saving}
                    className="rounded-full border border-black/40 px-3 py-1 font-space-mono text-[11px] uppercase tracking-[-0.44px] transition-colors hover:bg-black hover:text-[#FFFAEB] disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-inherit"
                >
                    {saving ? 'saving…' : 'save'}
                </button>
                <button
                    onClick={findCoordinates}
                    disabled={geocoding}
                    className="rounded-full border border-black/40 px-3 py-1 font-space-mono text-[11px] uppercase tracking-[-0.44px] transition-colors hover:bg-black hover:text-[#FFFAEB] disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-inherit"
                >
                    {geocoding ? 'looking up…' : 'find coordinates'}
                </button>

                {verified === false && (
                    <button
                        onClick={toggleVerified}
                        disabled={verifying}
                        className="rounded-full border border-[#C2371B] bg-[#C2371B] px-3 py-1 font-space-mono text-[11px] uppercase tracking-[-0.44px] text-[#FFFAEB] transition-opacity hover:opacity-80 disabled:opacity-30"
                    >
                        {verifying ? 'verifying…' : 'verify venue'}
                    </button>
                )}

                {saved && <span className="font-space-mono text-[11px] text-[#C2371B]">saved</span>}
                {error && <span className="font-space-mono text-[11px] text-[#C2371B]">{error}</span>}
                {/* Looking a venue up is the slow part of fixing one, so link
                    straight out to a map search for whatever's typed. */}
                <a
                    href={`https://www.openstreetmap.org/search?query=${encodeURIComponent(
                        `${draft.name} ${draft.address || draft.neighborhood} Los Angeles`,
                    )}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="ml-auto font-space-mono text-[11px] uppercase tracking-[-0.44px] text-black/45 underline-offset-4 hover:underline"
                >
                    look up coordinates ↗
                </a>
            </div>

            {geocodeNote && (
                <p className="mt-1.5 font-space-mono text-[11px] leading-[1.5] text-black/60">{geocodeNote}</p>
            )}
        </div>
    );
}

export default function VenuesClient({ venues }: { venues: AdminVenue[] }) {
    const [q, setQ] = useState('');
    const needsWork = venues.filter(v => v.lat == null || !v.neighborhood).length;
    const pending = venues.filter(v => v.verified === false).length;

    const shown = q.trim()
        ? venues.filter(v =>
            `${v.name} ${v.neighborhood} ${v.address}`.toLowerCase().includes(q.toLowerCase()))
        : venues;

    return (
        <div className="mx-auto max-w-4xl px-4 py-8">
            <h1 className="font-space-grotesk text-[28px] font-bold">Venues</h1>
            <p className="mt-1 font-space-mono text-[11px] uppercase tracking-[-0.44px] text-black/55">
                <span className="font-bold text-black">{venues.length}</span> venues ·{' '}
                <span className="font-bold text-[#C2371B]">{needsWork}</span> need attention
                {pending > 0 && (
                    <> · <span className="font-bold text-[#C2371B]">{pending}</span> submitted, awaiting review</>
                )}
            </p>

            <input
                value={q}
                onChange={e => setQ(e.target.value)}
                placeholder="filter by name, neighborhood or address…"
                className="mt-4 w-full rounded-full border border-black/30 bg-transparent px-4 py-2 text-[14px] placeholder:text-black/30 focus:border-[#C2371B] focus:outline-none"
            />

            <div className="mt-4 rounded-lg border border-black/10">
                {shown.map(v => <Row key={v.id} venue={v} />)}
                {shown.length === 0 && (
                    <p className="px-4 py-8 text-center font-space-mono text-[12px] uppercase tracking-[-0.44px] text-black/45">
                        nothing matches that
                    </p>
                )}
            </div>
        </div>
    );
}
