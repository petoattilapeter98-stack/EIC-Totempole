import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
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
  // Like Chrome: stop() ends the session asynchronously, firing onend once
  // already-captured audio has been processed.
  stop() {
    queueMicrotask(() => this.onend?.());
  }
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
  it('shows connecting, then Hold to Talk once ready -- and only starts recognition once the talk button is pressed', async () => {
    stubSpeechRecognition();
    startDirectLineConversation.mockResolvedValue(CONVERSATION);
    subscribeToDirectLineActivities.mockReturnValue(() => {});

    render(<VoiceConversation locale="en" reset={vi.fn()} />);

    expect(screen.getByText(voiceAssistantStrings.en.connecting)).toBeInTheDocument();

    const talkButton = await screen.findByRole('button', {
      name: voiceAssistantStrings.en.holdToTalk,
    });
    // Ready, but the mic must not be capturing until the button is held --
    // that's the whole point of push-to-talk (no ambient/continuous capture).
    expect(lastRecognition).toBeNull();

    fireEvent.pointerDown(talkButton);
    await waitFor(() => expect(screen.getByText(voiceAssistantStrings.en.listening)).toBeInTheDocument());
    expect(lastRecognition).not.toBeNull();
  });

  it('posts a recognized final utterance to Direct Line, renders it, and re-arms the idle countdown', async () => {
    stubSpeechRecognition();
    startDirectLineConversation.mockResolvedValue(CONVERSATION);
    subscribeToDirectLineActivities.mockReturnValue(() => {});
    const reset = vi.fn();

    render(<VoiceConversation locale="en" reset={reset} />);
    const talkButton = await screen.findByRole('button', {
      name: voiceAssistantStrings.en.holdToTalk,
    });
    fireEvent.pointerDown(talkButton);
    await waitFor(() => expect(lastRecognition).not.toBeNull());

    act(() => {
      lastRecognition?.onresult?.(finalResult('what is the innovation centre'));
    });
    fireEvent.pointerUp(talkButton);

    expect(await screen.findByText('what is the innovation centre')).toBeInTheDocument();
    expect(reset).toHaveBeenCalled();
    expect(postDirectLineMessage).toHaveBeenCalledWith(
      CONVERSATION,
      'what is the innovation centre',
      'en-GB',
    );
  });

  it('shows a thinking indicator once a question is sent, and clears it once the reply arrives', async () => {
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

    render(<VoiceConversation locale="en" reset={vi.fn()} />);
    const talkButton = await screen.findByRole('button', {
      name: voiceAssistantStrings.en.holdToTalk,
    });
    fireEvent.pointerDown(talkButton);
    await waitFor(() => expect(lastRecognition).not.toBeNull());

    expect(screen.queryByText(voiceAssistantStrings.en.thinking)).not.toBeInTheDocument();

    act(() => {
      lastRecognition?.onresult?.(finalResult('what is the innovation centre'));
    });
    fireEvent.pointerUp(talkButton);

    expect(await screen.findByText(voiceAssistantStrings.en.thinking)).toBeInTheDocument();

    act(() => {
      activityHandler.current?.({
        type: 'message',
        from: { id: 'bot' },
        text: 'The Innovation Centre hosts several programmes.',
      });
    });

    expect(
      await screen.findByText('The Innovation Centre hosts several programmes.'),
    ).toBeInTheDocument();
    expect(screen.queryByText(voiceAssistantStrings.en.thinking)).not.toBeInTheDocument();
  });

  it('clears the thinking indicator (and shows the send error) when posting the message fails', async () => {
    stubSpeechRecognition();
    startDirectLineConversation.mockResolvedValue(CONVERSATION);
    subscribeToDirectLineActivities.mockReturnValue(() => {});
    postDirectLineMessage.mockReset().mockRejectedValue(new Error('network'));

    render(<VoiceConversation locale="en" reset={vi.fn()} />);
    const talkButton = await screen.findByRole('button', {
      name: voiceAssistantStrings.en.holdToTalk,
    });
    fireEvent.pointerDown(talkButton);
    await waitFor(() => expect(lastRecognition).not.toBeNull());

    act(() => {
      lastRecognition?.onresult?.(finalResult('what is the innovation centre'));
    });
    fireEvent.pointerUp(talkButton);

    expect(await screen.findByText(voiceAssistantStrings.en.sendError)).toBeInTheDocument();
    expect(screen.queryByText(voiceAssistantStrings.en.thinking)).not.toBeInTheDocument();
  });

  it("does not render Direct Line's echo of the visitor's own posted message as an assistant line", async () => {
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

    render(<VoiceConversation locale="en" reset={vi.fn()} />);
    const talkButton = await screen.findByRole('button', {
      name: voiceAssistantStrings.en.holdToTalk,
    });
    fireEvent.pointerDown(talkButton);
    await waitFor(() => expect(lastRecognition).not.toBeNull());

    act(() => {
      lastRecognition?.onresult?.(finalResult('what is the innovation centre'));
    });
    fireEvent.pointerUp(talkButton);
    expect(await screen.findByText('what is the innovation centre')).toBeInTheDocument();

    // Direct Line echoes the posted message back with a server-assigned
    // from.id this app never sent -- it must be recognized as an echo and
    // dropped, not re-rendered as a second, assistant-styled bubble.
    act(() => {
      activityHandler.current?.({
        type: 'message',
        from: { id: 'echo-session-id-1' },
        text: 'what is the innovation centre',
      });
    });

    expect(screen.getAllByText('what is the innovation centre')).toHaveLength(1);

    // A later activity from that same now-known-self id must also be
    // dropped, even without an exact text match (covers retries/rephrasing
    // of the echo).
    act(() => {
      activityHandler.current?.({
        type: 'message',
        from: { id: 'echo-session-id-1' },
        text: 'something else entirely',
      });
    });
    expect(screen.queryByText('something else entirely')).not.toBeInTheDocument();

    // A genuine reply from the bot's own (different) id still renders.
    act(() => {
      activityHandler.current?.({
        type: 'message',
        from: { id: 'bot-id' },
        text: 'The Innovation Centre hosts several programmes.',
      });
    });
    expect(
      await screen.findByText('The Innovation Centre hosts several programmes.'),
    ).toBeInTheDocument();
  });

  it('sends one message per press, even when the visitor pauses mid-hold', async () => {
    stubSpeechRecognition();
    startDirectLineConversation.mockResolvedValue(CONVERSATION);
    subscribeToDirectLineActivities.mockReturnValue(() => {});

    render(<VoiceConversation locale="en" reset={vi.fn()} />);
    const talkButton = await screen.findByRole('button', {
      name: voiceAssistantStrings.en.holdToTalk,
    });
    fireEvent.pointerDown(talkButton);
    await waitFor(() => expect(lastRecognition).not.toBeNull());

    // Chrome finalizes a segment at the pause, then ends and is restarted
    // while the button is still held -- none of that may send anything.
    act(() => {
      lastRecognition?.onresult?.(finalResult('what is the'));
      lastRecognition?.onend?.();
    });
    expect(postDirectLineMessage).not.toHaveBeenCalled();

    act(() => {
      lastRecognition?.onresult?.(finalResult('innovation centre'));
    });
    expect(postDirectLineMessage).not.toHaveBeenCalled();

    fireEvent.pointerUp(talkButton);

    expect(await screen.findByText('what is the innovation centre')).toBeInTheDocument();
    expect(postDirectLineMessage).toHaveBeenCalledTimes(1);
    expect(postDirectLineMessage).toHaveBeenCalledWith(
      CONVERSATION,
      'what is the innovation centre',
      'en-GB',
    );
  });

  it('corrects a misheard "TEKsystems" before showing and sending the question', async () => {
    stubSpeechRecognition();
    startDirectLineConversation.mockResolvedValue(CONVERSATION);
    subscribeToDirectLineActivities.mockReturnValue(() => {});

    render(<VoiceConversation locale="en" reset={vi.fn()} />);
    const talkButton = await screen.findByRole('button', {
      name: voiceAssistantStrings.en.holdToTalk,
    });
    fireEvent.pointerDown(talkButton);
    await waitFor(() => expect(lastRecognition).not.toBeNull());

    act(() => {
      lastRecognition?.onresult?.(finalResult('what does tax systems do'));
    });
    fireEvent.pointerUp(talkButton);

    expect(await screen.findByText('what does TEKsystems do')).toBeInTheDocument();
    expect(postDirectLineMessage).toHaveBeenCalledWith(CONVERSATION, 'what does TEKsystems do', 'en-GB');
  });

  it('scrolls the transcript to the newest content when a reply arrives', async () => {
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

    const { container } = render(<VoiceConversation locale="en" reset={vi.fn()} />);
    await screen.findByRole('button', { name: voiceAssistantStrings.en.holdToTalk });
    const transcriptPanel = container.querySelector<HTMLElement>('[aria-live="polite"]')!;
    // jsdom does no layout, so give the panel a content height to scroll to.
    Object.defineProperty(transcriptPanel, 'scrollHeight', { configurable: true, value: 900 });
    transcriptPanel.scrollTop = 0;

    act(() => {
      activityHandler.current?.({
        type: 'message',
        from: { id: 'bot' },
        text: 'The Innovation Centre hosts several programmes.',
      });
    });

    await screen.findByText('The Innovation Centre hosts several programmes.');
    expect(transcriptPanel.scrollTop).toBe(900);
  });

  it('stops capturing audio when the talk button is released, and resumes on the next press', async () => {
    stubSpeechRecognition();
    startDirectLineConversation.mockResolvedValue(CONVERSATION);
    subscribeToDirectLineActivities.mockReturnValue(() => {});

    render(<VoiceConversation locale="en" reset={vi.fn()} />);
    const talkButton = await screen.findByRole('button', {
      name: voiceAssistantStrings.en.holdToTalk,
    });

    fireEvent.pointerDown(talkButton);
    await waitFor(() => expect(lastRecognition).not.toBeNull());
    const firstRecognition = lastRecognition;
    const stopSpy = vi.spyOn(firstRecognition!, 'stop');

    fireEvent.pointerUp(talkButton);
    // Releasing must not just hide the "listening" label -- it must actually
    // stop the underlying recognition session, not leave the mic capturing
    // in the background (e.g. picking up the assistant's own reply).
    expect(stopSpy).toHaveBeenCalled();
    await waitFor(() =>
      expect(screen.getByText(voiceAssistantStrings.en.holdToTalk)).toBeInTheDocument(),
    );

    fireEvent.pointerDown(talkButton);
    await waitFor(() => expect(lastRecognition).not.toBe(firstRecognition));
    expect(lastRecognition).not.toBeNull();
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

  it('renders markdown in a bot reply as real elements, not literal syntax', async () => {
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

    const { container } = render(<VoiceConversation locale="en" reset={vi.fn()} />);
    await waitFor(() => expect(activityHandler.current).not.toBeNull());

    act(() => {
      activityHandler.current?.({
        type: 'message',
        from: { id: 'bot' },
        text: 'Here are the **key** programmes:\n\n• RISE Programme\n\n• Leader Foundations',
      });
    });

    await screen.findByText('RISE Programme');
    expect(container.querySelector('ul > li')).not.toBeNull();
    expect(container.querySelector('strong')?.textContent).toBe('key');
    // The raw ** and • characters must never reach the DOM as literal text.
    expect(screen.queryByText(/\*\*/)).not.toBeInTheDocument();
    expect(screen.queryByText(/•/)).not.toBeInTheDocument();
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

    await waitFor(() =>
      expect(screen.getByText(voiceAssistantStrings.en.holdToTalk)).toBeInTheDocument(),
    );
    expect(startDirectLineConversation).toHaveBeenCalledTimes(2);
  });

  it('shows the not-supported banner when this browser has no SpeechRecognition implementation', async () => {
    startDirectLineConversation.mockResolvedValue(CONVERSATION);
    subscribeToDirectLineActivities.mockReturnValue(() => {});

    render(<VoiceConversation locale="en" reset={vi.fn()} />);

    expect(await screen.findByText(voiceAssistantStrings.en.micNotSupported)).toBeInTheDocument();
  });
});
