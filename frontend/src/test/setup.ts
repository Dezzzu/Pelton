// Loaded before every test file: jest-dom's matchers, and a DOM torn down
// between tests so one test's markup cannot be found by the next.
import '@testing-library/jest-dom/vitest'
import { cleanup } from '@testing-library/svelte'
import { afterEach } from 'vitest'

afterEach(() => {
  cleanup()
})
