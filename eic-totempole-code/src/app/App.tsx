import { ContentRegion } from '../components/ContentRegion/ContentRegion';
import { FooterBar } from '../components/FooterBar/FooterBar';
import { HeaderBar } from '../components/HeaderBar/HeaderBar';
import { HeroBanner } from '../components/HeroBanner/HeroBanner';
import { TabNav } from '../components/TabNav/TabNav';
import styles from './App.module.css';

/**
 * The kiosk shell: five explicit grid rows filling the 1920x1280 viewport.
 * Row sizing lives in App.module.css — header/hero/nav auto, content 1fr,
 * footer auto.
 */
export function App() {
  return (
    <div className={styles.shell}>
      <HeaderBar />
      <HeroBanner />
      <TabNav />
      <ContentRegion className={styles.content} />
      <FooterBar />
    </div>
  );
}
