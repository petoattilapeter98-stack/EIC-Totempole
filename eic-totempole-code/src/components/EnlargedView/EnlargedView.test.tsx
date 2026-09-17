import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { EnlargedView } from './EnlargedView';

/**
 * Contract: specs/004-tic-tac-toe/contracts/enlarged-view.md §5
 *
 * Every assertion here maps to one lettered rule (E1-E10) in that contract.
 */

function renderView(props: Partial<React.ComponentProps<typeof EnlargedView>> = {}) {
  return render(
    <EnlargedView active returnLabel="Close" onReturn={() => {}} {...props}>
      <div data-testid="child">content</div>
    </EnlargedView>,
  );
}

describe('EnlargedView', () => {
  it('carries data-enlarged-view while active, and data-attract-exempt only when exempt (E2)', () => {
    const { rerender } = render(
      <EnlargedView active returnLabel="Close" onReturn={() => {}}>
        <div />
      </EnlargedView>,
    );
    const panel = document.querySelector('[data-enlarged-view]');
    expect(panel).not.toBeNull();
    expect(panel).not.toHaveAttribute('data-attract-exempt');

    rerender(
      <EnlargedView active attractExempt returnLabel="Close" onReturn={() => {}}>
        <div />
      </EnlargedView>,
    );
    expect(document.querySelector('[data-enlarged-view]')).toHaveAttribute('data-attract-exempt');
  });

  it('carries neither attribute while inactive (E2)', () => {
    render(
      <EnlargedView active={false} attractExempt returnLabel="Close" onReturn={() => {}}>
        <div />
      </EnlargedView>,
    );
    expect(document.querySelector('[data-enlarged-view]')).toBeNull();
    expect(document.querySelector('[data-attract-exempt]')).toBeNull();
  });

  it('renders exactly one return control, named by returnLabel, only while active (E4)', () => {
    const { rerender } = renderView({ returnLabel: 'Close game' });
    const buttons = screen.getAllByRole('button', { name: 'Close game' });
    expect(buttons).toHaveLength(1);
    expect(buttons[0]).toHaveAttribute('type', 'button');

    rerender(
      <EnlargedView active={false} returnLabel="Close game" onReturn={() => {}}>
        <div data-testid="child">content</div>
      </EnlargedView>,
    );
    expect(screen.queryByRole('button', { name: 'Close game' })).not.toBeInTheDocument();
  });

  it('moves focus to the return control when mounted already active (E7)', () => {
    renderView({ returnLabel: 'Close' });
    expect(screen.getByRole('button', { name: 'Close' })).toHaveFocus();
  });

  it('moves focus to the return control when active flips from false to true (E7)', () => {
    const { rerender } = render(
      <EnlargedView active={false} returnLabel="Close" onReturn={() => {}}>
        <div data-testid="child">content</div>
      </EnlargedView>,
    );
    expect(screen.queryByRole('button', { name: 'Close' })).not.toBeInTheDocument();

    rerender(
      <EnlargedView active returnLabel="Close" onReturn={() => {}}>
        <div data-testid="child">content</div>
      </EnlargedView>,
    );
    expect(screen.getByRole('button', { name: 'Close' })).toHaveFocus();
  });

  it('calls onReturn once per activation of the return control', async () => {
    const user = userEvent.setup();
    const onReturn = vi.fn();
    renderView({ onReturn, returnLabel: 'Close' });

    await user.click(screen.getByRole('button', { name: 'Close' }));
    expect(onReturn).toHaveBeenCalledTimes(1);
  });

  it('announces no dialog semantics (E1)', () => {
    renderView();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(document.querySelector('[aria-modal]')).toBeNull();
    expect(document.querySelector('dialog')).toBeNull();
  });

  it('never calls the browser Fullscreen API (E1a)', async () => {
    const user = userEvent.setup();
    const requestFullscreen = vi.fn();
    // Not every DOM element has this in jsdom; stub it so a call would be caught.
    Element.prototype.requestFullscreen = requestFullscreen as unknown as typeof Element.prototype.requestFullscreen;

    const { rerender } = render(
      <EnlargedView active={false} returnLabel="Close" onReturn={() => {}}>
        <div data-testid="child">content</div>
      </EnlargedView>,
    );
    rerender(
      <EnlargedView active returnLabel="Close" onReturn={() => {}}>
        <div data-testid="child">content</div>
      </EnlargedView>,
    );
    await user.click(screen.getByRole('button', { name: 'Close' }));

    expect(requestFullscreen).not.toHaveBeenCalled();
  });

  it('never remounts children when active toggles, in either direction (E10)', () => {
    const { rerender } = render(
      <EnlargedView active={false} returnLabel="Close" onReturn={() => {}}>
        <div data-testid="child">content</div>
      </EnlargedView>,
    );
    const inactiveNode = screen.getByTestId('child');

    rerender(
      <EnlargedView active returnLabel="Close" onReturn={() => {}}>
        <div data-testid="child">content</div>
      </EnlargedView>,
    );
    expect(screen.getByTestId('child')).toBe(inactiveNode);

    rerender(
      <EnlargedView active={false} returnLabel="Close" onReturn={() => {}}>
        <div data-testid="child">content</div>
      </EnlargedView>,
    );
    expect(screen.getByTestId('child')).toBe(inactiveNode);
  });

  describe('adds no timers or document listeners across repeated mount cycles (E9)', () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });
    afterEach(() => {
      vi.useRealTimers();
    });

    it('balances document listener add/remove and leaves no timers after 20 cycles', () => {
      const addSpy = vi.spyOn(document, 'addEventListener');
      const removeSpy = vi.spyOn(document, 'removeEventListener');

      for (let i = 0; i < 20; i += 1) {
        const { unmount } = render(
          <EnlargedView active returnLabel="Close" onReturn={() => {}}>
            <div data-testid="child">content</div>
          </EnlargedView>,
        );
        act(() => {
          vi.advanceTimersByTime(1000);
        });
        unmount();
      }

      expect(vi.getTimerCount()).toBe(0);
      expect(addSpy.mock.calls.length).toBe(removeSpy.mock.calls.length);

      addSpy.mockRestore();
      removeSpy.mockRestore();
    });
  });
});
