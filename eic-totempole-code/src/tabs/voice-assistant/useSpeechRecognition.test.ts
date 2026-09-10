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
  startCount = 0;

  start() {
    this.startCount += 1;
    this.aborted = false;
    this.onstart?.();
  }

  stop() {
    // Not used by the hook (it always aborts), kept for interface completeness.
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

  it('calls onFinalTranscript for final results and exposes interim text for non-final ones', async () => {
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
    expect(onFinalTranscript).not.toHaveBeenCalled();

    act(() => {
      lastInstance?.onresult?.({
        resultIndex: 0,
        results: makeResultList([{ transcript: 'what is the innovation centre', isFinal: true }]),
      } as SpeechRecognitionEvent);
    });

    expect(onFinalTranscript).toHaveBeenCalledWith('what is the innovation centre');
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

  it('aborts and does not restart on cleanup (active -> false)', async () => {
    const onFinalTranscript = vi.fn();
    const { rerender } = renderHook(
      ({ active }: { active: boolean }) =>
        useSpeechRecognition({ lang: 'en-US', active, onFinalTranscript }),
      { initialProps: { active: true } },
    );
    await waitFor(() => expect(lastInstance).not.toBeNull());
    const instance = lastInstance;

    rerender({ active: false });

    expect(instance?.aborted).toBe(true);
    const startsAtCleanup = instance?.startCount ?? 0;
    instance?.onend?.();
    expect(instance?.startCount).toBe(startsAtCleanup);
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
