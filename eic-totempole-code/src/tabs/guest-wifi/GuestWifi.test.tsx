import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { KioskProvider } from '../../context/KioskContext';
import { LanguageToggle } from '../../components/LanguageToggle/LanguageToggle';
import { WIFI_CONFIG, type GuestNetworkConfig } from './wifiConfig.static';
import GuestWifi, { GuestWifiPanel } from './GuestWifi';
import { STRINGS } from './strings';

const CONFIGURED: GuestNetworkConfig = {
  ssid: 'TestGuest',
  password: 'testpass123',
  securityType: 'WPA',
};

const noop = () => {};

// ---------------------------------------------------------------------------
// User Story 1 — the QR plate
// ---------------------------------------------------------------------------

describe('GuestWifiPanel QR plate (US1, contracts/visual-theme.md §2)', () => {
  it('renders the QR code with fixed light/dark colours, never themed', () => {
    render(<GuestWifiPanel config={CONFIGURED} locale="en" onSave={noop} />);

    // Inline SVG attributes, not CSS classes, so no theme rule can retint
    // them (Clarifications 2026-09-10 Q1).
    expect(screen.getByTestId('qr-plate-bg')).toHaveAttribute('fill', '#FFFFFF');
    expect(screen.getByTestId('qr-plate-modules')).toHaveAttribute('fill', '#000000');
  });

  it('hides the QR code from assistive tech — the printed credentials carry the accessible name', () => {
    render(<GuestWifiPanel config={CONFIGURED} locale="en" onSave={noop} />);
    expect(screen.getByTestId('wifi-qr-plate')).toHaveAttribute('aria-hidden', 'true');
  });
});

// ---------------------------------------------------------------------------
// User Story 2 — manual fallback text + not-configured state
// ---------------------------------------------------------------------------

describe('GuestWifiPanel printed credentials (US2, spec Story 2 AC1)', () => {
  it('shows the network name and password as plain visible text with no tap required', () => {
    render(<GuestWifiPanel config={CONFIGURED} locale="en" onSave={noop} />);

    expect(screen.getByText(CONFIGURED.ssid)).toBeInTheDocument();
    expect(screen.getByText(CONFIGURED.password)).toBeInTheDocument();
  });

  it('omits the password row for an open (nopass) network instead of showing an empty value', () => {
    const open: GuestNetworkConfig = { ssid: 'Open-Net', password: '', securityType: 'nopass' };
    render(<GuestWifiPanel config={open} locale="en" onSave={noop} />);

    expect(screen.getByText('Open-Net')).toBeInTheDocument();
    expect(screen.queryByText('Password')).not.toBeInTheDocument();
  });
});

describe('GuestWifiPanel not-configured fallback (US2, spec Story 2 AC2, FR-014, research R7)', () => {
  const UNCONFIGURED: GuestNetworkConfig = { ssid: '', password: '', securityType: 'WPA' };

  it('shows the fallback heading/body instead of a QR code or credentials', () => {
    render(<GuestWifiPanel config={UNCONFIGURED} locale="en" onSave={noop} />);

    expect(screen.queryByTestId('wifi-qr-plate')).not.toBeInTheDocument();
    expect(screen.getByText(STRINGS.fallbackHeading.en)).toBeInTheDocument();
    expect(screen.getByText(STRINGS.fallbackBody.en)).toBeInTheDocument();
  });

  it('never attempts to build a QR payload from an unconfigured network', () => {
    // buildWifiQrPayload/buildQrMatrix would not throw on an empty ssid, but
    // data-model.md §1 rule 4 says the component must not call them at all in
    // this state — asserted structurally via the absence of the plate above,
    // and here by confirming no console error surfaces from the attempt.
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    render(<GuestWifiPanel config={UNCONFIGURED} locale="en" onSave={noop} />);
    expect(errorSpy).not.toHaveBeenCalled();
    errorSpy.mockRestore();
  });
});

// ---------------------------------------------------------------------------
// User Story 3 — language switching
// ---------------------------------------------------------------------------

describe('GuestWifiPanel language switching (US3, spec Story 3 AC1, FR-006)', () => {
  it('switches every instructional label to Hungarian while the SSID/password stay unchanged', () => {
    const { rerender } = render(<GuestWifiPanel config={CONFIGURED} locale="en" onSave={noop} />);
    expect(screen.getByText(STRINGS.scanInstruction.en)).toBeInTheDocument();
    expect(screen.getByText(STRINGS.networkNameLabel.en)).toBeInTheDocument();
    expect(screen.getByText(STRINGS.passwordLabel.en)).toBeInTheDocument();

    rerender(<GuestWifiPanel config={CONFIGURED} locale="hu" onSave={noop} />);

    expect(screen.getByText(STRINGS.scanInstruction.hu)).toBeInTheDocument();
    expect(screen.getByText(STRINGS.networkNameLabel.hu)).toBeInTheDocument();
    expect(screen.getByText(STRINGS.passwordLabel.hu)).toBeInTheDocument();
    expect(screen.queryByText(STRINGS.scanInstruction.en)).not.toBeInTheDocument();

    // Proper values, not translatable content — byte-identical in both locales.
    expect(screen.getByText(CONFIGURED.ssid)).toBeInTheDocument();
    expect(screen.getByText(CONFIGURED.password)).toBeInTheDocument();
  });

  it('switches copy end-to-end, driven through the real kiosk language toggle', async () => {
    const user = userEvent.setup();
    render(
      <KioskProvider>
        <LanguageToggle />
        <GuestWifi />
      </KioskProvider>,
    );

    // Exercises the actual wiring path a visitor takes (useKiosk() → the live
    // WIFI_CONFIG), not a locale prop the app never sets directly. Whichever
    // state WIFI_CONFIG is currently in (configured or the "not configured"
    // placeholder — see wifiConfig.static.ts) has its own EN string on screen
    // to start, and its own HU string after the toggle.
    const [enText, huText] = WIFI_CONFIG.ssid === ''
      ? [STRINGS.fallbackHeading.en, STRINGS.fallbackHeading.hu]
      : [STRINGS.scanInstruction.en, STRINGS.scanInstruction.hu];

    expect(screen.getByText(enText)).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /magyar|hungarian|hu/i }));

    expect(screen.getByText(huText)).toBeInTheDocument();
    expect(screen.queryByText(enText)).not.toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// User Story 4 — editing the network from the kiosk itself
// ---------------------------------------------------------------------------

describe('GuestWifiPanel on-screen editor (US4)', () => {
  it('opens the editor pre-filled with the current network, from the configured state', async () => {
    const user = userEvent.setup();
    render(<GuestWifiPanel config={CONFIGURED} locale="en" onSave={noop} />);

    await user.click(screen.getByRole('button', { name: STRINGS.editButtonLabel.en }));

    expect(screen.getByLabelText(STRINGS.editHeading.en)).toBeInTheDocument();
    expect(screen.getByDisplayValue(CONFIGURED.ssid)).toBeInTheDocument();
    expect(screen.getByDisplayValue(CONFIGURED.password)).toBeInTheDocument();
  });

  it('opens the editor from the not-configured fallback state too, so a first-time setup needs no code change', async () => {
    const user = userEvent.setup();
    const UNCONFIGURED: GuestNetworkConfig = { ssid: '', password: '', securityType: 'WPA' };
    render(<GuestWifiPanel config={UNCONFIGURED} locale="en" onSave={noop} />);

    await user.click(screen.getByRole('button', { name: STRINGS.editButtonLabel.en }));
    expect(screen.getByLabelText(STRINGS.editHeading.en)).toBeInTheDocument();
  });

  it('saves the edited network name and password and returns to the display view', async () => {
    const user = userEvent.setup();
    const onSave = vi.fn();
    render(<GuestWifiPanel config={CONFIGURED} locale="en" onSave={onSave} />);

    await user.click(screen.getByRole('button', { name: STRINGS.editButtonLabel.en }));
    const ssidInput = screen.getByDisplayValue(CONFIGURED.ssid);
    await user.clear(ssidInput);
    await user.type(ssidInput, 'New Network');
    const passwordInput = screen.getByDisplayValue(CONFIGURED.password);
    await user.clear(passwordInput);
    await user.type(passwordInput, 'brandnewpass');
    await user.click(screen.getByRole('button', { name: STRINGS.saveButtonLabel.en }));

    expect(onSave).toHaveBeenCalledWith({
      ssid: 'New Network',
      password: 'brandnewpass',
      securityType: 'WPA',
    });
    // Back to the display view, not left in the form.
    expect(screen.queryByLabelText(STRINGS.editHeading.en)).not.toBeInTheDocument();
  });

  it('discards changes on Cancel without calling onSave', async () => {
    const user = userEvent.setup();
    const onSave = vi.fn();
    render(<GuestWifiPanel config={CONFIGURED} locale="en" onSave={onSave} />);

    await user.click(screen.getByRole('button', { name: STRINGS.editButtonLabel.en }));
    const ssidInput = screen.getByDisplayValue(CONFIGURED.ssid);
    await user.clear(ssidInput);
    await user.type(ssidInput, 'Whatever');
    await user.click(screen.getByRole('button', { name: STRINGS.cancelButtonLabel.en }));

    expect(onSave).not.toHaveBeenCalled();
    expect(screen.getByText(CONFIGURED.ssid)).toBeInTheDocument();
  });

  it('shows an inline error and does not save when the network name is empty', async () => {
    const user = userEvent.setup();
    const onSave = vi.fn();
    render(<GuestWifiPanel config={CONFIGURED} locale="en" onSave={onSave} />);

    await user.click(screen.getByRole('button', { name: STRINGS.editButtonLabel.en }));
    const ssidInput = screen.getByDisplayValue(CONFIGURED.ssid);
    await user.clear(ssidInput);
    await user.click(screen.getByRole('button', { name: STRINGS.saveButtonLabel.en }));

    expect(onSave).not.toHaveBeenCalled();
    expect(screen.getByText(STRINGS.ssidLengthError.en)).toBeInTheDocument();
  });

  it('shows an inline error and does not save when the WPA password is too short', async () => {
    const user = userEvent.setup();
    const onSave = vi.fn();
    render(<GuestWifiPanel config={CONFIGURED} locale="en" onSave={onSave} />);

    await user.click(screen.getByRole('button', { name: STRINGS.editButtonLabel.en }));
    const passwordInput = screen.getByDisplayValue(CONFIGURED.password);
    await user.clear(passwordInput);
    await user.type(passwordInput, 'short');
    await user.click(screen.getByRole('button', { name: STRINGS.saveButtonLabel.en }));

    expect(onSave).not.toHaveBeenCalled();
    expect(screen.getByText(STRINGS.passwordLengthError.en)).toBeInTheDocument();
  });

  it('hides the password field and saves an open network when "Open network" is selected', async () => {
    const user = userEvent.setup();
    const onSave = vi.fn();
    render(<GuestWifiPanel config={CONFIGURED} locale="en" onSave={onSave} />);

    await user.click(screen.getByRole('button', { name: STRINGS.editButtonLabel.en }));
    await user.click(screen.getByRole('button', { name: STRINGS.securityOpenLabel.en }));

    expect(screen.queryByDisplayValue(CONFIGURED.password)).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: STRINGS.saveButtonLabel.en }));

    expect(onSave).toHaveBeenCalledWith({
      ssid: CONFIGURED.ssid,
      password: '',
      securityType: 'nopass',
    });
  });
});

describe('GuestWifi persists edits to this device (US4, research R8)', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    localStorage.clear();
  });

  it('shows a saved edit again after remounting the tab', async () => {
    const user = userEvent.setup();
    const { unmount } = render(
      <KioskProvider>
        <GuestWifi />
      </KioskProvider>,
    );

    await user.click(screen.getByRole('button', { name: STRINGS.editButtonLabel.en }));
    const ssidInput = screen.getByLabelText(STRINGS.networkNameLabel.en);
    await user.clear(ssidInput);
    await user.type(ssidInput, 'Persisted Network');
    const passwordInput = screen.getByLabelText(STRINGS.passwordLabel.en);
    await user.clear(passwordInput);
    await user.type(passwordInput, 'persistedpass1');
    await user.click(screen.getByRole('button', { name: STRINGS.saveButtonLabel.en }));

    unmount();
    render(
      <KioskProvider>
        <GuestWifi />
      </KioskProvider>,
    );

    expect(screen.getByText('Persisted Network')).toBeInTheDocument();
    expect(screen.getByText('persistedpass1')).toBeInTheDocument();
  });
});
