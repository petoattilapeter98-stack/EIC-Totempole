import styles from './AmbientAurora.module.css';

interface AmbientAuroraProps {
  readonly active: boolean;
}

/**
 * Slow colour wash behind the shell, shown only in attract mode.
 *
 * Purely decorative and non-interactive, so it is hidden from assistive tech.
 * Its animations are paused whenever `active` is false - see the CSS module for
 * why that matters on a display that runs for days.
 */
export function AmbientAurora({ active }: AmbientAuroraProps) {
  return (
    <div
      className={`${styles.aurora} ${active ? styles.visible : ''}`}
      aria-hidden="true"
      data-testid="ambient-aurora"
      data-active={active}
    >
      <span className={`${styles.blob} ${styles.blobA}`} />
      <span className={`${styles.blob} ${styles.blobB}`} />
      <span className={`${styles.blob} ${styles.blobC}`} />
    </div>
  );
}
