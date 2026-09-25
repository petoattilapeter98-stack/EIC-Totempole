import { act, renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { useSpeechRecognition } from './useSpeechRecognition';

class FakeSpeechRecognition extends EventTarget implements SpeechRecognition {
  continuous = false;
  interimResults = false;
  lang = '';
  onstart: (() => void) | null = null;
  onend: (() => void) | null = null;
  onresult: ((event: SpeechRecognitionEvent) => void) | null = null;
  onerror: ((event: SpeechRecognitionErrorEvent) => void) | null = null;
  aborted = false;
  stopped = false;
  startCount = 0;

  start() {
    this.startCount += 1;
    this.aborted = false;
    this.stopped = false;
    this.onstart?.();
  }

  stop() {
    this.stopped = true;
  }

  abort() {
    this.aborted = true;
  }
}

function makeResultList(
  entries: ReadonlyArray<{ transcript: string; isFinal: boolean }>,
): SpeechRecognitionResultList {
  const results = entries.map((entry) => {
    const alternative: SpeechRecognitionAlternative = { transcript: entry.transcript, confidence: 1 };
    return Object.assign([alternative], { isFinal: entry.isFinal, length: 1 }) as unknown as SpeechRecognitionResult;
  });
  return Object.assign(results, { length: results.length }) as unknown as SpeechRecognitionResultList;
}

let lastInstance: FakeSpeechRecognition | null = null;

beforeEach(() => {
  lastInstance = null;
  vi.stubGlobal(
    'webkitSpeechRecognition',
    vi.fn(() => {
      lastInstance = new FakeSpeechRecognition();
      return lastInstance;
    }),
  );
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('useSpeechRecognition', () => {
  it('reports not-supported and never starts when no SpeechRecognition constructor exists', () => {
    vi.unstubAllGlobals();
    const onFinalTranscript = vi.fn();
    const { result } = renderHook(() =>
      useSpeechRecognition({ lang: 'en-US', active: true, onFinalTranscript }),
    );

    expect(result.current.supported).toBe(false);
    expect(result.current.error).toBe('not-supported');
    expect(lastInstance).toBeNull();
  });

  it('does not start recognition while inactive', () => {
    const onFinalTranscript = vi.fn();
    renderHook(() => useSpeechRecognition({ lang: 'en-US', active: false, onFinalTranscript }));

    expect(lastInstance).toBeNull();
  });

  it('starts recognition in continuous/interim mode once active', async () => {
    const onFinalTranscript = vi.fn();
    const { result } = renderHook(() =>
      useSpeechRecognition({ lang: 'en-US', active: true, onFinalTranscript }),
    );

    await waitFor(() => expect(lastInstance).not.toBeNull());
    expect(lastInstance?.continuous).toBe(true);
    expect(lastInstance?.interimResults).toBe(true);
    expect(lastInstance?.lang).toBe('en-US');
    await waitFor(() => expect(result.current.listening).toBe(true));
  });

  it('buffers final results during the activation and shows them, plus interim text, as live feedback', async () => {
    const onFinalTranscript = vi.fn();
    const { result } = renderHook(() =>
      useSpeechRecognition({ lang: 'en-US', active: true, onFinalTranscript }),
    );
    await waitFor(() => expect(lastInstance).not.toBeNull());

    act(() => {
      lastInstance?.onresult?.({
        resultIndex: 0,
        results: makeResultList([{ transcript: 'what is the innovation', isFinal: false }]),
      } as SpeechRecognitionEvent);
    });
    await waitFor(() => expect(result.current.interimTranscript).toBe('what is the innovation'));

    act(() => {
      lastInstance?.onresult?.({
        resultIndex: 0,
        results: makeResultList([
          { transcript: 'what is the innovation centre', isFinal: true },
          { transcript: ' and who', isFinal: false },
        ]),
      } as SpeechRecognitionEvent);
    });

    await waitFor(() =>
      expect(result.current.interimTranscript).toBe('what is the innovation centre and who'),
    );
    // Nothing is sent while the button is still held.
    expect(onFinalTranscript).not.toHaveBeenCalled();
  });

  it('restarts automatically on end while still active (Chrome stops "continuous" mode after a pause)', async () => {
    const onFinalTranscript = vi.fn();
    renderHook(() => useSpeechRecognition({ lang: 'en-US', active: true, onFinalTranscript }));
    await waitFor(() => expect(lastInstance).not.toBeNull());

    const startsBefore = lastInstance?.startCount ?? 0;
    act(() => {
      lastInstance?.onend?.();
    });

    expect(lastInstance?.startCount).toBe(startsBefore + 1);
  });

  it('stops (not aborts) and does not restart on cleanup (active -> false), so a trailing utterance is not discarded', async () => {
    const onFinalTranscript = vi.fn();
    const { rerender } = renderHook(
      ({ active }: { active: boolean }) =>
        useSpeechRecognition({ lang: 'en-US', active, onFinalTranscript }),
      { initialProps: { active: true } },
    );
    await waitFor(() => expect(lastInstance).not.toBeNull());
    const instance = lastInstance;

    rerender({ active: false });

    // stop() (not abort()) so Chrome finishes processing already-captured
    // audio instead of silently dropping the last words spoken right before
    // the push-to-talk button was released.
    expect(instance?.stopped).toBe(true);
    expect(instance?.aborted).toBe(false);
    const startsAtCleanup = instance?.startCount ?? 0;
    act(() => {
      instance?.onend?.();
    });
    expect(instance?.startCount).toBe(startsAtCleanup);
  });

  it('sends every final segment of one activation as a single joined utterance, after the stopped session ends', async () => {
    const onFinalTranscript = vi.fn();
    const { rerender } = renderHook(
      ({ active }: { active: boolean }) =>
        useSpeechRecognition({ lang: 'en-US', active, onFinalTranscript }),
      { initialProps: { active: true } },
    );
    await waitFor(() => expect(lastInstance).not.toBeNull());
    const instance = lastInstance;

    act(() => {
      instance?.onresult?.({
        resultIndex: 0,
        results: makeResultList([{ transcript: 'what is the', isFinal: true }]),
      } as SpeechRecognitionEvent);
      // A pause: Chrome ends the session and the hook restarts it mid-hold.
      instance?.onend?.();
      instance?.onresult?.({
        resultIndex: 0,
        results: makeResultList([{ transcript: ' innovation', isFinal: true }]),
      } as SpeechRecognitionEvent);
    });
    expect(onFinalTranscript).not.toHaveBeenCalled();

    rerender({ active: false });
    expect(instance?.stopped).toBe(true);

    // The trailing final result stop() triggers arrives asynchronously,
    // after cleanup has already run -- it must still be included.
    act(() => {
      instance?.onresult?.({
        resultIndex: 0,
        results: makeResultList([{ transcript: 'centre', isFinal: true }]),
      } as SpeechRecognitionEvent);
    });
    expect(onFinalTranscript).not.toHaveBeenCalled();

    act(() => {
      instance?.onend?.();
      instance?.onend?.();
    });

    expect(onFinalTranscript).toHaveBeenCalledTimes(1);
    expect(onFinalTranscript).toHaveBeenCalledWith('what is the innovation centre');
  });

  it('sends nothing when an activation ends without any final result', async () => {
    const onFinalTranscript = vi.fn();
    const { rerender } = renderHook(
      ({ active }: { active: boolean }) =>
        useSpeechRecognition({ lang: 'en-US', active, onFinalTranscript }),
      { initialProps: { active: true } },
    );
    await waitFor(() => expect(lastInstance).not.toBeNull());
    const instance = lastInstance;

    rerender({ active: false });
    act(() => {
      instance?.onend?.();
    });

    expect(onFinalTranscript).not.toHaveBeenCalled();
  });

  it('flushes once after a fallback delay if the stopped session never fires onend', async () => {
    const onFinalTranscript = vi.fn();
    const { rerender } = renderHook(
      ({ active }: { active: boolean }) =>
        useSpeechRecognition({ lang: 'en-US', active, onFinalTranscript }),
      { initialProps: { active: true } },
    );
    await waitFor(() => expect(lastInstance).not.toBeNull());
    const instance = lastInstance;

    act(() => {
      instance?.onresult?.({
        resultIndex: 0,
        results: makeResultList([{ transcript: 'hello', isFinal: true }]),
      } as SpeechRecognitionEvent);
    });

    vi.useFakeTimers();
    try {
      rerender({ active: false });
      act(() => {
        vi.advanceTimersByTime(2000);
      });
      expect(onFinalTranscript).toHaveBeenCalledTimes(1);
      expect(onFinalTranscript).toHaveBeenCalledWith('hello');

      // A late onend after the fallback already flushed must not send again.
      act(() => {
        instance?.onend?.();
      });
      expect(onFinalTranscript).toHaveBeenCalledTimes(1);
    } finally {
      vi.useRealTimers();
    }
  });

  it('maps a permission-denied error distinctly from a generic failure', async () => {
    const onFinalTranscript = vi.fn();
    const { result } = renderHook(() =>
      useSpeechRecognition({ lang: 'en-US', active: true, onFinalTranscript }),
    );
    await waitFor(() => expect(lastInstance).not.toBeNull());

    act(() => {
      lastInstance?.onerror?.({ error: 'not-allowed', message: '' } as SpeechRecognitionErrorEvent);
    });
    await waitFor(() => expect(result.current.error).toBe('no-permission'));
  });
});
