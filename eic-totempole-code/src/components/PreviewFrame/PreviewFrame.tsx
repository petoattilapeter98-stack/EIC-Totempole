import type { ReactNode } from 'react';

import { usePreviewScale } from '../../hooks/usePreviewScale';
import styles from './PreviewFrame.module.css';

interface PreviewFrameProps {
  readonly children: ReactNode;
}

/**
 * Renders the kiosk at its true 1920x1280 proportions, scaled to fit smaller
 * screens - so a deploy can be sanity-checked from a phone or laptop.
 *
 * This is a VALIDATION aid, not responsive design. The point is to show
 * exactly what the Hub renders, just smaller; a reflowed mobile layout would
 * show something production never displays, which is worse than useless for
 * checking kiosk changes.
 *
 * On a kiosk-sized viewport usePreviewScale returns null and this component
 * renders its children directly, adding no wrapper element and no styling.
 * Production is therefore untouched by anything in this file.
 */
export function PreviewFrame({ children }: PreviewFrameProps) {
  const scale = usePreviewScale();

  if (scale === null) {
    return <>{children}</>;
  }

  return (
    <div className={styles.frame} data-testid="preview-frame">
      <div className={styles.stage} style={{ transform: `scale(${scale})` }}>
        {children}
      </div>
    </div>
  );
}
