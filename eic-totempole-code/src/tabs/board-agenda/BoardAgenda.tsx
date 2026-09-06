import { Calendar, MapPin } from 'lucide-react';

import { accentVars } from '../../components/TabPlaceholder/accent';
import { useKiosk } from '../../context/KioskContext';
import { useClock } from '../../hooks/useClock';
import { agenda, MAX_VISIBLE_SESSIONS } from './agenda.static';
import { sessionStatus, upNextSessionId } from './agenda';
import { agendaStrings } from './strings';
import styles from './BoardAgenda.module.css';

/**
 * Board agenda. Reads the schedule from agenda.static.ts and marks each session
 * past / live / upcoming against the current wall-clock time.
 *
 * The live highlight is the reason this beats a printed schedule: a visitor
 * glances at the kiosk and immediately sees what is on right now and where.
 * It reuses useClock, so it stays correct for the whole day without a reload.
 */
export default function BoardAgenda() {
  const { locale } = useKiosk();
  const { now } = useClock();
  const s = agendaStrings[locale];

  const sessions = agenda.sessions.slice(0, MAX_VISIBLE_SESSIONS);
  const nextId = upNextSessionId(sessions, now);

  return (
    <div className={styles.agenda}>
      <header className={styles.header}>
        <div className={styles.iconWrap}>
          <Calendar className={styles.icon} aria-hidden="true" />
        </div>
        <div>
          <h2 className={styles.heading}>{s.heading}</h2>
          <p className={styles.subheading}>
            {agenda.label[locale]} &middot; {s.subheading}
          </p>
        </div>
      </header>

      {sessions.length === 0 ? (
        <p className={styles.empty}>{s.emptyState}</p>
      ) : (
        <ul className={styles.list}>
          {sessions.map((session) => {
            const status = sessionStatus(session, now);
            const isNext = status === 'upcoming' && session.id === nextId;

            return (
              <li
                key={session.id}
                className={[
                  styles.row,
                  status === 'live' ? styles.live : '',
                  status === 'past' ? styles.past : '',
                ]
                  .filter(Boolean)
                  .join(' ')}
                style={accentVars(session.accent)}
              >
                <div className={styles.time}>
                  <span className={styles.timeStart}>{session.start}</span>
                  <span className={styles.timeEnd}>&ndash; {session.end}</span>
                </div>

                <div className={styles.details}>
                  <h3 className={styles.title}>{session.title[locale]}</h3>
                  <p className={styles.presenter}>
                    {s.presenterLabel}: {session.presenter[locale]}
                  </p>
                </div>

                <div className={styles.meta}>
                  <span className={styles.room}>
                    <MapPin className={styles.roomIcon} aria-hidden="true" />
                    {session.room[locale]}
                  </span>

                  {/* Status is announced as text, never colour alone. */}
                  {status === 'live' && (
                    <span className={`${styles.badge} ${styles.liveBadge}`}>
                      <span className={styles.livePulse} aria-hidden="true" />
                      {s.liveBadge}
                    </span>
                  )}
                  {isNext && (
                    <span className={`${styles.badge} ${styles.nextBadge}`}>
                      {s.nextBadge}
                    </span>
                  )}
                  {status === 'past' && (
                    <span className={`${styles.badge} ${styles.pastBadge}`}>
                      {s.endedLabel}
                    </span>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
