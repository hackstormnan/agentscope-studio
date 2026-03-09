/**
 * AgentScope Studio — integration smoke test entry point.
 *
 * Imports all test suites and delegates to the runner.
 * Invoked via:
 *
 *   npm test
 *   npm run test:integration
 *   npm run ci:smoke
 *
 * Exit codes:
 *   0  all tests passed
 *   1  one or more tests failed
 */

import './integration/replay-dataset.test';
import './integration/evaluate-run.test';
import './integration/regression-report.test';

import { run } from './lib/runner';

run().catch((err: unknown) => {
  console.error('Test runner crashed:', err instanceof Error ? err.message : String(err));
  process.exit(1);
});
