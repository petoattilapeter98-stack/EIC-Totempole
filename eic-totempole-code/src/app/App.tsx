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
 * everything. Any touch returns it immediately. Row sizing never changes, so
 * the no-scroll guarantee holds in both states.
 */
export function App() {
  const { isAttract } = useKiosk();

  return (
    <div className={`${styles.shell} ${isAttract ? styles.attract : ''}`} data-attract={isAttract}>
      <AmbientAurora active={isAttract} />

      <div className={styles.recede}>
        <HeaderBar />
      </div>

      <div className={styles.hero}>
        <HeroBanner />
      </div>

      <div className={styles.recede}>
        <TabNav />
      </div>

      <ContentRegion className={`${styles.content} ${styles.recede}`} />

      <div className={styles.recede}>
        <FooterBar />
      </div>
    </div>
  );
}
