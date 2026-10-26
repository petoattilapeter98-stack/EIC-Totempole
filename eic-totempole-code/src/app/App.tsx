import { AmbientAurora } from '../components/AmbientAurora/AmbientAurora';
import { ContentRegion } from '../components/ContentRegion/ContentRegion';
import { FooterBar } from '../components/FooterBar/FooterBar';
import { HeaderBar } from '../components/HeaderBar/HeaderBar';
import { HeroBanner } from '../components/HeroBanner/HeroBanner';
import { TabNav } from '../components/TabNav/TabNav';
import { useKiosk } from '../context/KioskContext';
import styles from './App.module.css';

/**
 * The kiosk shell: five explicit grid rows filling the 1920x1280 viewport.
 * Row sizing lives in App.module.css - header/hero/nav auto, content 1fr,
 * footer auto.
 *
 * When nobody has touched the kiosk for a while it drifts into attract mode:
 * the chrome recedes, the hero grows, and an ambient wash fades in behind
 * everything. Any touch returns it immediately.
 *
 * A feature can also collapse the hero to give its height to the content row
 * (src/components/HeroBanner/collapseHero.ts). The content row stays the only
 * flexible row either way, so the no-scroll guarantee holds in every state.
 */
export function App() {
  const { isAttract } = useKiosk();

  return (
    <div className={`${styles.shell} ${isAttract ? styles.attract : ''}`} data-attract={isAttract}>
      <AmbientAurora active={isAttract} />

      <div className={styles.recede}>
        <HeaderBar />
      </div>

      {/* Two wrappers so the hero row can collapse smoothly - see
          "Collapsed hero" in App.module.css. */}
      <div className={styles.hero}>
        <div className={styles.heroClip}>
          <HeroBanner />
        </div>
      </div>

      <div className={`${styles.recede} ${styles.nav}`}>
        <TabNav />
      </div>

      <ContentRegion className={`${styles.content} ${styles.recede}`} />

      <div className={styles.recede}>
        <FooterBar />
      </div>
    </div>
  );
}
