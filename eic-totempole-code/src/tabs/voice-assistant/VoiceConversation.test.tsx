import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { voiceAssistantStrings } from './strings';
import { VoiceConversation } from './VoiceConversation';
import type { DirectLineActivity } from './directLineClient';

vi.mock('./agentConfig', () => ({
  DIRECT_LINE_PROVISION_TOKEN_URL: 'https://example.test/directline-token',
}));

const startDirectLineConversation = vi.fn();
const subscribeToDirectLineActivities = vi.fn();
const postDirectLineMessage = vi.fn();

vi.mock('./directLineClient', () => ({
  startDirectLineConversation: (...args: unknown[]) => startDirectLineConversation(...args),
  subscribeToDirectLineActivities: (...args: unknown[]) => subscribeToDirectLineActivities(...args),
  postDirectLineMessage: (...args: unknown[]) => postDirectLineMessage(...args),
  KIOSK_VISITOR_ID: 'kiosk-visitor',
}));

class FakeSpeechRecognition extends EventTarget implements SpeechRecognition {
  continuous = false;
  interimResults = false;
  lang = '';
  onstart: (() => void) | null = null;
  onend: (() => void) | null = null;
  onresult: ((event: SpeechRecognitionEvent) => void) | null = null;
  onerror: ((event: SpeechRecognitionErrorEvent) => void) | null = null;

  start() {
    this.onstart?.();
  }
  stop() {}
  abort() {}
}

function finalResult(transcript: string): SpeechRecognitionEvent {
  const alternative: SpeechRecognitionAlternative = { transcript, confidence: 1 };
  const result = Object.assign([alternative], { isFinal: true, length: 1 }) as unknown as SpeechRecognitionResult;
  const results = Object.assign([result], { length: 1 }) as unknown as SpeechRecognitionResultList;
  return { resultIndex: 0, results } as SpeechRecognitionEvent;
}

let lastRecognition: FakeSpeechRecognition | null = null;

function stubSpeechRecognition() {
  vi.stubGlobal(
    'webkitSpeechRecognition',
    vi.fn(() => {
      lastRecognition = new FakeSpeechRecognition();
      return lastRecognition;
    }),
  );
}

const CONVERSATION = { conversationId: 'c1', token: 't1', streamUrl: 'wss://example.test/stream' };

beforeEach(() => {
  lastRecognition = null;
  startDirectLineConversation.mockReset();
  subscribeToDirectLineActivities.mockReset();
  postDirectLineMessage.mockReset().mockResolvedValue(undefined);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('VoiceConversation', () => {
  it('shows connecting, then the listening indicator once Direct Line and speech recognition are both ready', async () => {
    stubSpeechRecognition();
    startDirectLineConversation.mockResolvedValue(CONVERSATION);
    subscribeToDirectLineActivities.mockReturnValue(() => {});

    render(<VoiceConversation locale="en" reset={vi.fn()} />);

    expect(screen.getByText(voiceAssistantStrings.en.connecting)).toBeInTheDocument();

    await waitFor(() => expect(screen.getByText(voiceAssistantStrings.en.listening)).toBeInTheDocument());
  });

  it('posts a recognized final utterance to Direct Line, renders it, and re-arms the idle countdown -- with no button press', async () => {
    stubSpeechRecognition();
    startDirectLineConversation.mockResolvedValue(CONVERSATION);
    subscribeToDirectLineActivities.mockReturnValue(() => {});
    const reset = vi.fn();

    render(<VoiceConversation locale="en" reset={reset} />);
    await waitFor(() => expect(lastRecognition).not.toBeNull());

    act(() => {
      lastRecognition?.onresult?.(finalResult('what is the innovation centre'));
    });

    expect(await screen.findByText('what is the innovation centre')).toBeInTheDocument();
    expect(reset).toHaveBeenCalled();
    expect(postDirectLineMessage).toHaveBeenCalledWith(
      CONVERSATION,
      'what is the innovation centre',
      'en-GB',
    );
  });

  it('renders an incoming bot reply as an assistant line and re-arms the idle countdown', async () => {
    stubSpeechRecognition();
    startDirectLineConversation.mockResolvedValue(CONVERSATION);
    const activityHandler: { current: ((activity: DirectLineActivity) => void) | null } = {
      current: null,
    };
    subscribeToDirectLineActivities.mockImplementation(
      (_streamUrl: string, handler: (a: DirectLineActivity) => void) => {
        activityHandler.current = handler;
        return () => {};
      },
    );
    const reset = vi.fn();

    render(<VoiceConversation locale="en" reset={reset} />);
    await waitFor(() => expect(activityHandler.current).not.toBeNull());
    reset.mockClear();

    act(() => {
      activityHandler.current?.({
        type: 'message',
        from: { id: 'bot' },
        text: 'The Innovation Centre hosts...',
      });
    });

    expect(await screen.findByText('The Innovation Centre hosts...')).toBeInTheDocument();
    expect(reset).toHaveBeenCalled();
  });

  it('shows a recoverable error with Retry when the Direct Line connection fails, and reconnects on retry', async () => {
    stubSpeechRecognition();
    startDirectLineConversation.mockRejectedValueOnce(new Error('network'));
    startDirectLineConversation.mockResolvedValueOnce(CONVERSATION);
    subscribeToDirectLineActivities.mockReturnValue(() => {});

    const user = userEvent.setup();
    render(<VoiceConversation locale="en" reset={vi.fn()} />);

    expect(await screen.findByText(voiceAssistantStrings.en.loadError)).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: voiceAssistantStrings.en.retry }));

    await waitFor(() => expect(screen.getByText(voiceAssistantStrings.en.listening)).toBeInTheDocument());
    expect(startDirectLineConversation).toHaveBeenCalledTimes(2);
  });

  it('shows the not-supported banner when this browser has no SpeechRecognition implementation', async () => {
    startDirectLineConversation.mockResolvedValue(CONVERSATION);
    subscribeToDirectLineActivities.mockReturnValue(() => {});

    render(<VoiceConversation locale="en" reset={vi.fn()} />);

    expect(await screen.findByText(voiceAssistantStrings.en.micNotSupported)).toBeInTheDocument();
  });
});
