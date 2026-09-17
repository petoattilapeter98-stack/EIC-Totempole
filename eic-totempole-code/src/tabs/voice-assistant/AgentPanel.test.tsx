import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { KioskProvider } from '../../context/KioskContext';
import { LanguageToggle } from '../../components/LanguageToggle/LanguageToggle';
import { examplePrompts } from './examplePrompts';
import { meta } from './meta';
import { voiceAssistantStrings } from './strings';
import { AgentPanel } from './AgentPanel';

// AgentPanel's own job is the idle <-> active state machine and its i18n
// chrome (spec FR-001, FR-002, FR-008, FR-016); the voice conversation's own
// connection/recognition/transcript behavior is covered by
// VoiceConversation.test.tsx and useSpeechRecognition.test.ts.
vi.mock('./VoiceConversation', () => ({
  VoiceConversation: () => <div data-testid="voice-conversation-stub" />,
}));

function renderPanel() {
  return render(
    <KioskProvider>
      <LanguageToggle />
      <AgentPanel />
    </KioskProvider>,
  );
}

describe('AgentPanel', () => {
  it('renders the idle state with heading, subheading, example prompts, and a Start button (FR-016)', () => {
    renderPanel();

    expect(screen.getByRole('heading', { name: meta.label.en })).toBeInTheDocument();
    expect(screen.getByText(voiceAssistantStrings.en.subheading)).toBeInTheDocument();

    for (const prompt of examplePrompts) {
      expect(screen.getByText(prompt.text.en)).toBeInTheDocument();
    }

    expect(
      screen.getByRole('button', { name: voiceAssistantStrings.en.startButton }),
    ).toBeInTheDocument();
  });

  it('mounts the voice conversation and shows End when Start is tapped, with no other button in between (FR-001, FR-002, FR-004)', async () => {
    const user = userEvent.setup();
    renderPanel();

    await user.click(screen.getByRole('button', { name: voiceAssistantStrings.en.startButton }));

    expect(screen.getByTestId('voice-conversation-stub')).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: voiceAssistantStrings.en.endButton }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: voiceAssistantStrings.en.startButton }),
    ).not.toBeInTheDocument();
  });

  it('returns to idle and unmounts the conversation when End is tapped (FR-008, FR-012)', async () => {
    const user = userEvent.setup();
    renderPanel();

    await user.click(screen.getByRole('button', { name: voiceAssistantStrings.en.startButton }));
    await user.click(screen.getByRole('button', { name: voiceAssistantStrings.en.endButton }));

    expect(screen.queryByTestId('voice-conversation-stub')).not.toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: voiceAssistantStrings.en.startButton }),
    ).toBeInTheDocument();
    for (const prompt of examplePrompts) {
      expect(screen.getByText(prompt.text.en)).toBeInTheDocument();
    }
  });

  it('renders in Hungarian when the shell locale is switched (FR-015)', async () => {
    const user = userEvent.setup();
    renderPanel();

    await user.click(screen.getByRole('button', { name: /switch language to hungarian/i }));

    expect(screen.getByRole('heading', { name: meta.label.hu })).toBeInTheDocument();
    expect(screen.getByText(voiceAssistantStrings.hu.subheading)).toBeInTheDocument();
    for (const prompt of examplePrompts) {
      expect(screen.getByText(prompt.text.hu)).toBeInTheDocument();
    }
    expect(
      screen.getByRole('button', { name: voiceAssistantStrings.hu.startButton }),
    ).toBeInTheDocument();
  });
});
