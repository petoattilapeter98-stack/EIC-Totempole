import { useCallback, useMemo, useState, type FormEvent } from 'react';
import { Check, Pencil, X } from 'lucide-react';

import { useKiosk } from '../../context/KioskContext';
import type { Locale } from '../../i18n/locales';
import { buildQrMatrix, buildWifiQrPayload } from './qr';
import { getGuestWifiStrings } from './strings';
import { loadStoredConfig, saveConfigOverride, validateConfigInput } from './wifiConfig.storage';
import { WIFI_CONFIG, type GuestNetworkConfig } from './wifiConfig.static';
import styles from './GuestWifi.module.css';

/**
 * Modules of light margin around the QR code on every side — the QR
 * standard's mandatory "quiet zone" a scanner needs to find the code at all.
 * contracts/visual-theme.md §2.
 */
const QUIET_ZONE_MODULES = 4;

/** Fixed QR plate colours — NEVER themed. See FR-002, Clarifications 2026-09-10 Q1. */
const QR_LIGHT = '#FFFFFF';
const QR_DARK = '#000000';

/**
 * Renders a boolean module matrix as one compact `<path>` (batched, per
 * contracts/visual-theme.md §2) rather than one `<rect>` per module — a
 * worst-case 63-char password can produce thousands of modules, and a single
 * path element is far cheaper to mount than that many DOM nodes.
 */
function buildModulePathD(matrix: boolean[][]): string {
  let d = '';
  for (let row = 0; row < matrix.length; row++) {
    const cols = matrix[row]!;
    for (let col = 0; col < cols.length; col++) {
      if (cols[col]) {
        const x = col + QUIET_ZONE_MODULES;
        const y = row + QUIET_ZONE_MODULES;
        d += `M${x} ${y}h1v1h-1z`;
      }
    }
  }
  return d;
}

interface QrPlateProps {
  readonly matrix: boolean[][];
}

/**
 * The QR code as its own small "light plate" — fixed colours regardless of
 * the panel's ambient glow, `aria-hidden` because the printed credentials
 * beside it already carry the equivalent information for assistive tech
 * (contracts/visual-theme.md §2, mirrors 003-restaurant-map's "the embed's
 * pins are not relied on for any accessible name").
 */
function QrPlate({ matrix }: QrPlateProps) {
  const size = matrix.length + QUIET_ZONE_MODULES * 2;
  const pathD = useMemo(() => buildModulePathD(matrix), [matrix]);

  return (
    <svg
      className={styles.qrPlate}
      viewBox={`0 0 ${size} ${size}`}
      data-testid="wifi-qr-plate"
      aria-hidden="true"
      shapeRendering="crispEdges"
    >
      <rect data-testid="qr-plate-bg" x={0} y={0} width={size} height={size} fill={QR_LIGHT} />
      <path data-testid="qr-plate-modules" d={pathD} fill={QR_DARK} />
    </svg>
  );
}

interface EditFormProps {
  readonly initial: GuestNetworkConfig;
  readonly strings: ReturnType<typeof getGuestWifiStrings>;
  readonly onSave: (config: GuestNetworkConfig) => void;
  readonly onCancel: () => void;
}

/**
 * The on-screen editor an operator uses to set the guest network directly
 * from the kiosk, no redeploy required. Inline within the panel — no modal,
 * no route (Constitution IV) — exactly like every other state change in this
 * app.
 *
 * The password field is deliberately `type="text"`, not `type="password"`:
 * this panel already prints the password in plaintext for every visitor to
 * read (spec Assumptions), so masking it only while typing would add
 * friction without adding any actual privacy.
 */
function EditForm({ initial, strings: s, onSave, onCancel }: EditFormProps) {
  const [draft, setDraft] = useState(initial);
  const [showErrors, setShowErrors] = useState(false);
  const errors = validateConfigInput(draft);

  const handleSubmit = useCallback(
    (event: FormEvent) => {
      event.preventDefault();
      if (Object.keys(errors).length > 0) {
        setShowErrors(true);
        return;
      }
      onSave(draft);
    },
    [draft, errors, onSave],
  );

  return (
    <form className={styles.editForm} onSubmit={handleSubmit} aria-label={s.editHeading}>
      <h3 className={styles.editHeading}>{s.editHeading}</h3>

      <div className={styles.field}>
        <label className={styles.fieldLabel} htmlFor="gw-ssid">
          {s.networkNameLabel}
        </label>
        <input
          id="gw-ssid"
          className={styles.fieldInput}
          type="text"
          inputMode="text"
          maxLength={32}
          value={draft.ssid}
          onChange={(e) => setDraft((d) => ({ ...d, ssid: e.target.value }))}
          aria-invalid={showErrors && Boolean(errors.ssid)}
          aria-describedby={showErrors && errors.ssid ? 'gw-ssid-error' : undefined}
        />
        {showErrors && errors.ssid ? (
          <p id="gw-ssid-error" className={styles.fieldError}>
            {s.ssidLengthError}
          </p>
        ) : null}
      </div>

      <div className={styles.field}>
        <span className={styles.fieldLabel}>{s.passwordLabel}</span>
        <div className={styles.securityToggle} role="group" aria-label={s.securityTypeLabel}>
          <button
            type="button"
            className={styles.securityOption}
            aria-pressed={draft.securityType === 'WPA'}
            onClick={() => setDraft((d) => ({ ...d, securityType: 'WPA' }))}
          >
            {s.securityWpaLabel}
          </button>
          <button
            type="button"
            className={styles.securityOption}
            aria-pressed={draft.securityType === 'nopass'}
            onClick={() => setDraft((d) => ({ ...d, securityType: 'nopass', password: '' }))}
          >
            {s.securityOpenLabel}
          </button>
        </div>
        {draft.securityType === 'WPA' ? (
          <>
            <input
              id="gw-password"
              className={styles.fieldInput}
              type="text"
              inputMode="text"
              maxLength={63}
              value={draft.password}
              onChange={(e) => setDraft((d) => ({ ...d, password: e.target.value }))}
              aria-invalid={showErrors && Boolean(errors.password)}
              aria-describedby={showErrors && errors.password ? 'gw-password-error' : undefined}
              aria-label={s.passwordLabel}
            />
            {showErrors && errors.password ? (
              <p id="gw-password-error" className={styles.fieldError}>
                {s.passwordLengthError}
              </p>
            ) : null}
          </>
        ) : null}
      </div>

      <div className={styles.formActions}>
        <button type="button" className={styles.cancelButton} onClick={onCancel}>
          <X className={styles.actionIcon} aria-hidden="true" />
          {s.cancelButtonLabel}
        </button>
        <button type="submit" className={styles.saveButton}>
          <Check className={styles.actionIcon} aria-hidden="true" />
          {s.saveButtonLabel}
        </button>
      </div>
    </form>
  );
}

export interface GuestWifiPanelProps {
  readonly config: GuestNetworkConfig;
  readonly locale: Locale;
  /** Called with the operator's edited config when they tap Save. */
  readonly onSave: (config: GuestNetworkConfig) => void;
}

/**
 * The panel's content, decomposed from the zero-prop tab entry below so it
 * can be rendered directly against any config fixture in tests — the same
 * pattern `RestaurantList` uses in 003-restaurant-map, and the only way to
 * exercise a configured network without mutating the live `WIFI_CONFIG`/
 * stored-override state.
 */
export function GuestWifiPanel({ config, locale, onSave }: GuestWifiPanelProps) {
  const s = getGuestWifiStrings(locale);
  const isConfigured = config.ssid !== '';
  const [isEditing, setIsEditing] = useState(false);

  // Only built once a real network is confirmed (data-model.md §1 rule 4) —
  // never attempted against the placeholder/unconfigured sentinel.
  const matrix = useMemo(
    () => (isConfigured ? buildQrMatrix(buildWifiQrPayload(config)) : null),
    [isConfigured, config],
  );

  const handleSave = useCallback(
    (next: GuestNetworkConfig) => {
      onSave(next);
      setIsEditing(false);
    },
    [onSave],
  );

  return (
    <div className={styles.root}>
      <div className={styles.headerRow}>
        <h2 className={styles.heading}>{s.heading}</h2>
        {isEditing ? null : (
          <button
            type="button"
            className={styles.editButton}
            onClick={() => setIsEditing(true)}
          >
            <Pencil className={styles.actionIcon} aria-hidden="true" />
            {s.editButtonLabel}
          </button>
        )}
      </div>

      {isEditing ? (
        <EditForm
          initial={config}
          strings={s}
          onSave={handleSave}
          onCancel={() => setIsEditing(false)}
        />
      ) : isConfigured && matrix ? (
        <div className={styles.body}>
          <QrPlate matrix={matrix} />
          <div className={styles.credentials}>
            <p className={styles.instruction}>{s.scanInstruction}</p>
            <dl className={styles.credentialList}>
              <div className={styles.credentialRow}>
                <dt className={styles.credentialLabel}>{s.networkNameLabel}</dt>
                <dd className={styles.credentialValue}>{config.ssid}</dd>
              </div>
              {/* No password row for an open network — there is nothing to
                  type, so showing an empty value would only confuse. */}
              {config.securityType === 'nopass' ? null : (
                <div className={styles.credentialRow}>
                  <dt className={styles.credentialLabel}>{s.passwordLabel}</dt>
                  <dd className={styles.credentialValue}>{config.password}</dd>
                </div>
              )}
            </dl>
          </div>
        </div>
      ) : (
        <div className={styles.fallback} role="status">
          <h3 className={styles.fallbackHeading}>{s.fallbackHeading}</h3>
          <p className={styles.fallbackBody}>{s.fallbackBody}</p>
        </div>
      )}
    </div>
  );
}

/**
 * Guest Wi-Fi destination. No props — resolves the effective config from
 * this kiosk's saved override (if any) or the static `WIFI_CONFIG` default,
 * and persists edits back to this device's own storage (research R8).
 */
export default function GuestWifi() {
  const { locale } = useKiosk();
  const [config, setConfig] = useState<GuestNetworkConfig>(() => loadStoredConfig() ?? WIFI_CONFIG);

  const handleSave = useCallback((next: GuestNetworkConfig) => {
    saveConfigOverride(next);
    setConfig(next);
  }, []);

  return <GuestWifiPanel config={config} locale={locale} onSave={handleSave} />;
}
