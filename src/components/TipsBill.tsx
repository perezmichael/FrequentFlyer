export default function TipsBill() {
    return (
        <div className="relative cursor-pointer hover:scale-105 transition-transform duration-200">
            <svg width="80" height="36" viewBox="0 0 80 36" fill="none" xmlns="http://www.w3.org/2000/svg">
                {/* Bill background */}
                <rect x="1" y="1" width="78" height="34" rx="3" fill="#85BB65" stroke="#5A8045" strokeWidth="2" />

                {/* Decorative border */}
                <rect x="4" y="4" width="72" height="28" rx="2" fill="none" stroke="#5A8045" strokeWidth="1" strokeDasharray="2 2" />

                {/* 100 in corners */}
                <text x="8" y="14" fontFamily="var(--font-space-mono), monospace" fontSize="10" fontWeight="bold" fill="#2D4A1F">
                    100
                </text>
                <text x="58" y="30" fontFamily="var(--font-space-mono), monospace" fontSize="10" fontWeight="bold" fill="#2D4A1F">
                    100
                </text>

                {/* TIPS text */}
                <text x="40" y="22" fontFamily="var(--font-space-mono), monospace" fontSize="12" fontWeight="bold" fill="#2D4A1F" textAnchor="middle">
                    TIPS
                </text>

                {/* Decorative circles */}
                <circle cx="15" cy="18" r="6" fill="none" stroke="#5A8045" strokeWidth="1" />
                <circle cx="65" cy="18" r="6" fill="none" stroke="#5A8045" strokeWidth="1" />
            </svg>
        </div>
    );
}
