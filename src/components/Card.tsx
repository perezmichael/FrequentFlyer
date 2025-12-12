import Link from 'next/link';
import styles from './Card.module.css';

interface CardProps {
    title: string;
    description: string;
    href: string;
    tag?: string;
    image?: string; // Optional image for future use
}

export default function Card({ title, description, href, tag }: CardProps) {
    return (
        <Link href={href} className={styles.card}>
            {tag && <span className={styles.tag}>{tag}</span>}
            <h3 className={styles.title}>{title}</h3>
            <p className={styles.description}>{description}</p>
        </Link>
    );
}
