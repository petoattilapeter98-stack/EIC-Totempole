import { useCallback, useEffect, useState } from 'react';
import { Calendar, ChevronDown, MapPin } from 'lucide-react';

import { accentVars } from '../../components/TabPlaceholder/accent';
import { useKiosk } from '../../context/KioskContext';
import { useClock } from '../../hooks/useClock';
import { agenda, MAX_VISIBLE_SESSIONS } from './agenda.static';
import {
  dayPhase,
  durationMinutes,
  firstStartTime,
  sessionStatus,
  upNextSessionId,
  visibleSessions,
} from './agenda';
import { agendaStrings, formatDuration } from './strings';
import styles from './BoardAgenda.module.css';

/**
 * Board agenda. Reads the schedule from agenda.static.ts and marks each session
 * past / live / upcoming against the current wall-clock time.
 *
 * The live highlight is the reason this beats a printed schedule: a visitor
 * glances at the kiosk and immediately sees what is on right now and where.
 * It reuses useClock, so it stays correct for the whole day without a reload.
 *
 * Tapping a session opens it in place (accordion, one at a time). It is an
 * INLINE state change, not a modal or an overlay: the row grows, its
 * neighbours give up the height, and nothing covers the nav (Constitution IV).
 * Because the panel's total height is fixed, every extra pixel the open row
 * takes is a pixel taken from the others - which is why collapsed rows tighten
 * up rather than the list growing.
 */
export default function BoardAgenda() {
  const { locale, isAttract } = useKiosk();
  const { now } = useClock();
  const s = agendaStrings[locale];

  const [expandedId, setExpandedId] = useState<string | null>(null);

  /**
   * Fold the panel back up when the kiosk goes into attract mode.
   *
   * An open session is a visitor's transient state, and attract mode means the
   * visitor has left: without this, the kiosk would sit in front of the lobby
   * all night showing whatever row the last person happened to tap, with four
   * squashed rows under it.
   *
   * No timer of its own - it rides the idle clock the shell already runs, so
   * there is nothing extra to tear down (Constitution V).
   */
  useEffect(() => {
    if (isAttract) setExpandedId(null);
  }, [isAttract]);

  const toggleSession = useCallback((id: string) => {
    setExpandedId((current) => (current === id ? null : id));
  }, []);

  const sessions = visibleSessions(agenda.sessions, now, MAX_VISIBLE_SESSIONS);
  const nextId = upNextSessionId(sessions, now);
  const phase = dayPhase(agenda.sessions, now);

  /**
   * Derived, not stored: the visible window moves with the clock, so the row a
   * visitor opened can slide out of it while it is still open. Resolving the
   * open row against what is actually on screen each render means that case
   * needs no effect and cannot leave the panel with a phantom open row.
   */
  const openId = sessions.some((session) => session.id === expandedId) ? expandedId : null;

  const dayNote =
    phase === 'before'
      ? s.dayNotStarted.replace('{time}', firstStartTime(agenda.sessions) ?? '')
      : phase === 'after'
        ? s.dayEnded
        : null;

  return (
    /*
      `data-expanded` sits on the ROOT, not the list: opening a session also
      hides the tab header to free the height the detail panel needs, and the
      header is the list's sibling.
    */
    <div className={styles.agenda} data-expanded={openId !== null ? 'true' : undefined}>
      {/*
        The wrapper exists purely so the header can COLLAPSE rather than
        disappear: it is the grid row that animates from its natural height to
        zero. The header keeps its own markup and stays in the accessibility
        tree the whole time - it is clipped, not removed.
      */}
      <div className={styles.headerWrap}>
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

          {/*
            Only rendered outside the running day. During the summit the live and
            up-next badges already say where things stand, and a third status line
            would just be noise beside them.
          */}
          {dayNote !== null && (
            <p className={styles.dayNote} role="status">
              {dayNote}
            </p>
          )}
        </header>
      </div>

      {sessions.length === 0 ? (
        <p className={styles.empty}>{s.emptyState}</p>
      ) : (
        <ul className={styles.list}>
          {sessions.map((session) => {
            const status = sessionStatus(session, now);
            const isNext = status === 'upcoming' && session.id === nextId;
            const isOpen = session.id === openId;
            const panelId = `agenda-detail-${session.id}`;
            const buttonId = `agenda-summary-${session.id}`;

            return (
              <li
                key={session.id}
                className={[
                  styles.row,
                  status === 'live' ? styles.live : '',
                  status === 'past' ? styles.past : '',
                  isOpen ? styles.open : '',
                ]
                  .filter(Boolean)
                  .join(' ')}
                style={accentVars(session.accent)}
              >
                {/*
                  Heading wrapping a button is the standard accordion shape: the
                  session keeps its place in the heading outline while the whole
                  row - not just the title - is the touch target, which is what
                  gets it past the 64px minimum without padding games
                  (Constitution III). The button's children are spans because a
                  <button> may only contain phrasing content.
                */}
                <h3 className={styles.rowHeading}>
                  <button
                    type="button"
                    id={buttonId}
                    className={styles.summary}
                    onClick={() => toggleSession(session.id)}
                    aria-expanded={isOpen}
                    aria-controls={panelId}
                  >
                    <span className={styles.time}>
                      <span className={styles.timeStart}>{session.start}</span>
                      <span className={styles.timeEnd}>&ndash; {session.end}</span>
                    </span>

                    <span className={styles.details}>
                      <span className={styles.title}>{session.title[locale]}</span>
                      <span className={styles.presenter}>
                        {s.presenterLabel}: {session.presenter[locale]}
                      </span>
                    </span>

                    <span className={styles.meta}>
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
                    </span>

                    {/*
                      The chevron is the only thing on the row that says "this
                      opens". It has to be visible at rest: the kiosk is
                      touch-only, so there is no hover state to reveal an
                      affordance with (Constitution I).
                    */}
                    <span className={styles.chevronWrap}>
                      <ChevronDown className={styles.chevron} aria-hidden="true" />
                      <span className={styles.srOnly}>
                        {isOpen ? s.hideDetails : s.showDetails}
                      </span>
                    </span>
                  </button>
                </h3>

                {/*
                  Kept mounted and hidden rather than conditionally rendered, so
                  `aria-controls` always points at a real element.
                */}
                <div
                  id={panelId}
                  className={styles.detail}
                  role="region"
                  aria-labelledby={buttonId}
                  hidden={!isOpen}
                >
                  <p className={styles.duration}>
                    <span className={styles.detailLabel}>{s.durationLabel}</span>
                    <span className={styles.durationValue}>
                      {formatDuration(durationMinutes(session), s)}
                    </span>
                  </p>

                  {session.description && (
                    <p className={styles.description}>{session.description[locale]}</p>
                  )}

                  {session.topics && session.topics.length > 0 && (
                    <div className={styles.topics}>
                      <span className={styles.detailLabel}>{s.topicsLabel}</span>
                      <ul className={styles.topicList}>
                        {session.topics.map((topic) => (
                          <li key={topic.en} className={styles.topic}>
                            {topic[locale]}
                          </li>
                        ))}
                      </ul>
                    </div>
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
