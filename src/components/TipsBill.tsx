import Link from 'next/link';

export default function TipsBill({ onClick }: { onClick?: () => void }) {
    return (
        <Link
            href="/tips"
            onClick={onClick}
            aria-label="Tip Frequent Flyer"
            className="relative block hover:scale-105 transition-transform duration-200"
        >
            <img
                src="/images/100dolla.svg"
                alt=""
                style={{ height: '36px', width: 'auto', display: 'block' }}
            />
        </Link>
    );
}
