import styles from './MapLoader.module.css';

export default function MapLoader() {
    return (
        <div className={styles.container}>
            <div className={styles.crosshair}>
                <div className={styles.ringOuter} />
                <div className={styles.ring} />
                <div className={styles.horizontal} />
                <div className={styles.vertical} />
                <div className={styles.dot} />
            </div>
            <p className={styles.label}>
                MAPPING LOS ANGELES<span className={styles.cursor}>_</span>
            </p>
        </div>
    );
}
