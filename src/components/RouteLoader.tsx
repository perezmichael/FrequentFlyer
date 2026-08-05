/**
 * The between-pages loader.
 *
 * Lives as a component rather than a single app/loading.tsx because a
 * `loading.tsx` opens a Suspense boundary over its whole segment *and every
 * segment beneath it* — which starts streaming, commits a 200, and makes any
 * notFound() below it a soft 404. One at the app root meant /event/[id],
 * /guides/[slug] and /[neighborhood] all answered 200 "Not found", which
 * Google treats as a real page.
 *
 * So each route that can't 404 opts in with its own one-line loading.tsx, and
 * the three that can 404 deliberately go without. That trade is the whole
 * point: for pages meant to rank, the status code beats a spinner.
 */
export default function RouteLoader() {
    return (
        <div className="bg-cream min-h-screen w-full flex flex-col items-center justify-center gap-[14px]">
            <div className="flex gap-[6px]" aria-hidden>
                {[0, 1, 2].map((i) => (
                    <span
                        key={i}
                        className="w-[10px] h-[10px] rounded-full bg-brand animate-bounce"
                        style={{ animationDelay: `${i * 0.12}s`, animationDuration: '0.9s' }}
                    />
                ))}
            </div>
            <p className="font-space-mono uppercase text-[12px] tracking-[-0.44px] text-black/55">
                finding the scene…
            </p>
        </div>
    );
}
