export default function Loading() {
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
