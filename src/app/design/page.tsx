import type { Metadata } from 'next';
import Link from 'next/link';
import { COLORS, BORDERS, FONTS, TYPE_SCALE, TRACKING } from '@/features/frequent-flyer/design/tokens';
import {
    navLink,
    createPill,
    filterPill,
    filterPillBase,
    filterPillActive,
    filterPillInactive,
} from '@/features/frequent-flyer/design/patterns';

export const metadata: Metadata = {
    title: 'Design DNA · Frequent Flyer',
    description: 'The living style guide — tokens and patterns the app is built on.',
};

const labelClass = 'font-space-mono text-[11px] uppercase tracking-[-0.44px] text-black/50';
const sectionTitleClass = 'font-space-mono text-[20px] uppercase tracking-[-0.64px] text-ink';

function Section({ title, kicker, children }: { title: string; kicker: string; children: React.ReactNode }) {
    return (
        <section className="border-t border-black/10 pt-8 mt-12 first:border-t-0 first:mt-0 first:pt-0">
            <p className={labelClass}>{kicker}</p>
            <h2 className={`${sectionTitleClass} mt-1 mb-6`}>{title}</h2>
            {children}
        </section>
    );
}

/** A pattern demo: the live element next to its import name. */
function Demo({ code, children }: { code: string; children: React.ReactNode }) {
    return (
        <div className="flex flex-col gap-3 border border-black/10 rounded-2xl p-5 bg-cream">
            <div className="flex flex-wrap items-center gap-4">{children}</div>
            <code className="font-space-mono text-[11px] text-accent tracking-[-0.44px]">{code}</code>
        </div>
    );
}

export default function DesignPage() {
    return (
        <main className="bg-cream min-h-screen">
            <div className="page-container pt-[140px] pb-24 max-w-[960px]">
                {/* Header */}
                <header className="mb-12">
                    <p className={labelClass}>Frequent Flyer</p>
                    <h1 className="font-space-mono text-[32px] md:text-[40px] uppercase tracking-[-0.64px] text-ink mt-1 mb-4">
                        Design DNA
                    </h1>
                    <p className="font-space-grotesk text-[16px] text-black/70 max-w-[560px] leading-relaxed">
                        Cream paper, near-black ink, one purple accent, monospace type in
                        UPPERCASE with tight tracking, and fully-rounded pill controls. This
                        page renders straight from{' '}
                        <code className="text-accent">design/tokens.ts</code> and{' '}
                        <code className="text-accent">design/patterns.ts</code>, so it can&apos;t
                        drift from what ships.
                    </p>
                </header>

                {/* Colors */}
                <Section kicker="01" title="Colors">
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                        {COLORS.map((c) => (
                            <div key={c.token} className="flex flex-col gap-2">
                                <div
                                    className="h-24 rounded-2xl border border-black/10 flex items-end p-3"
                                    style={{ background: c.hex }}
                                >
                                    <span
                                        className="font-space-mono text-[11px] uppercase tracking-[-0.44px]"
                                        style={{ color: c.darkBg ? '#FFFAEB' : '#1a1a1a' }}
                                    >
                                        {c.hex}
                                    </span>
                                </div>
                                <div>
                                    <p className="font-space-mono text-[13px] uppercase tracking-[-0.44px] text-ink">
                                        {c.name} · <span className="text-accent">{c.token}</span>
                                    </p>
                                    <p className="font-space-grotesk text-[12px] text-black/60 leading-snug">{c.usage}</p>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Borders */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-6">
                        {BORDERS.map((b) => (
                            <div key={b.name} className="rounded-2xl p-4" style={{ border: `1px solid ${b.value}` }}>
                                <p className="font-space-mono text-[13px] uppercase tracking-[-0.44px] text-ink">{b.name}</p>
                                <p className="font-space-grotesk text-[12px] text-black/60 leading-snug">{b.usage}</p>
                            </div>
                        ))}
                    </div>
                </Section>

                {/* Type */}
                <Section kicker="02" title="Type">
                    <div className="flex flex-col gap-5">
                        {FONTS.map((f) => (
                            <div key={f.name} className="border border-black/10 rounded-2xl p-5 bg-cream">
                                <p className={`${f.className} text-[28px] uppercase tracking-[-0.64px] text-ink`}>{f.sample}</p>
                                <p className="font-space-mono text-[12px] uppercase tracking-[-0.44px] text-accent mt-2">
                                    {f.name} · {f.className}
                                </p>
                                <p className="font-space-grotesk text-[13px] text-black/60 mt-1">{f.role}</p>
                            </div>
                        ))}
                    </div>

                    {/* Type scale */}
                    <div className="mt-6 flex flex-col divide-y divide-black/10">
                        {TYPE_SCALE.map((t) => (
                            <div key={t.className} className="flex items-baseline gap-4 py-2">
                                <span className={`${t.className} font-space-mono text-ink leading-none`}>Aa</span>
                                <span className="font-space-mono text-[12px] text-accent tracking-[-0.44px] w-[110px] shrink-0">
                                    {t.className}
                                </span>
                                <span className="font-space-grotesk text-[13px] text-black/60">{t.usage}</span>
                            </div>
                        ))}
                    </div>
                    <p className="font-space-grotesk text-[13px] text-black/60 mt-4">
                        Label tracking: <code className="text-accent">{TRACKING.label}</code> ·
                        Small-pill tracking: <code className="text-accent">{TRACKING.pill}</code>
                    </p>
                </Section>

                {/* Patterns */}
                <Section kicker="03" title="Patterns">
                    <p className="font-space-grotesk text-[14px] text-black/70 mb-6 max-w-[560px]">
                        Import these from{' '}
                        <code className="text-accent">@/features/frequent-flyer/design/patterns</code>{' '}
                        instead of re-typing class strings. Each demo below is the live element.
                    </p>

                    <div className="flex flex-col gap-4">
                        <Demo code="navLink">
                            <Link href="/design" className={navLink}>home</Link>
                            <Link href="/design" className={navLink}>events</Link>
                            <Link href="/design" className={navLink}>map</Link>
                        </Demo>

                        <Demo code="createPill — hover to see the invert">
                            <span className={createPill}>+ create</span>
                        </Demo>

                        <Demo code="filterPill(true) / filterPill(false)">
                            <span className={filterPill(true)}>Friday</span>
                            <span className={filterPill(false)}>Saturday</span>
                            <span className={filterPill(false)}>Echo Park</span>
                        </Demo>

                        <Demo code="filterPillBase + filterPillActive / filterPillInactive">
                            <span className={`${filterPillBase} ${filterPillActive}`}>active</span>
                            <span className={`${filterPillBase} ${filterPillInactive}`}>inactive</span>
                        </Demo>
                    </div>
                </Section>

                {/* Rules */}
                <Section kicker="04" title="Rules of thumb">
                    <ul className="flex flex-col gap-3 font-space-grotesk text-[14px] text-black/80 leading-relaxed">
                        {[
                            'Reuse before reinvent — import an existing pattern; add a new export to patterns.ts when a primitive will repeat.',
                            'Use brand tokens (bg-cream, text-ink, text-accent) over raw hex in new code.',
                            'Labels are UPPERCASE monospace with negative tracking — that tightness is the signature.',
                            'Controls are pills: fully rounded, hairline ink border; selected = solid black with cream text.',
                            "Don't touch the shadcn scaffold (src/components/ui/*, oklch tokens) unless you're in /admin.",
                            'Change a token? Update globals.css and tokens.ts, then eyeball this page.',
                        ].map((rule, i) => (
                            <li key={i} className="flex gap-3">
                                <span className="font-space-mono text-accent text-[14px] shrink-0">{String(i + 1).padStart(2, '0')}</span>
                                <span>{rule}</span>
                            </li>
                        ))}
                    </ul>
                    <p className="font-space-grotesk text-[13px] text-black/50 mt-6">
                        Full written reference lives in <code className="text-accent">CLAUDE.md</code> at the repo root.
                    </p>
                </Section>
            </div>
        </main>
    );
}
