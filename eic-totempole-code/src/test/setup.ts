import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterEach } from 'vitest';

// RTL does not auto-clean when `globals` are enabled via projects config,
// so unmount explicitly. This also means every test exercises the unmount
// path — which is where the timer/listener cleanup assertions live.
afterEach(() => {
  cleanup();
});
