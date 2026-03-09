/**
 * Minimal zero-dependency test runner.
 *
 * Uses Node's built-in `assert` module for assertions.
 * No external test framework is required — `ts-node` is the only runtime.
 *
 * Usage:
 *
 *   import { suite, test, run } from '../lib/runner';
 *   import assert from 'assert/strict';
 *
 *   suite('My module', () => {
 *     test('does the thing', async () => {
 *       assert.strictEqual(1 + 1, 2);
 *     });
 *   });
 *
 *   // At the bottom of the entry-point file:
 *   run();
 */

export { default as assert } from 'assert/strict';

type TestFn = () => Promise<void> | void;

interface TestCase {
  name: string;
  fn:   TestFn;
}

interface Suite {
  name:  string;
  tests: TestCase[];
}

const suites: Suite[] = [];
let activeSuite: Suite | null = null;

export function suite(name: string, register: () => void): void {
  activeSuite = { name, tests: [] };
  suites.push(activeSuite);
  register();
  activeSuite = null;
}

export function test(name: string, fn: TestFn): void {
  if (!activeSuite) throw new Error('test() must be called inside suite()');
  activeSuite.tests.push({ name, fn });
}

export async function run(): Promise<void> {
  let passed = 0;
  let failed = 0;

  for (const s of suites) {
    console.log(`\n${s.name}`);
    console.log('─'.repeat(Math.min(s.name.length, 60)));

    for (const t of s.tests) {
      try {
        await t.fn();
        console.log(`  ✓  ${t.name}`);
        passed++;
      } catch (err: unknown) {
        console.error(`  ✗  ${t.name}`);
        if (err instanceof Error) {
          // Show only the first line of the message to keep output compact.
          const firstLine = err.message.split('\n')[0];
          console.error(`       ${firstLine}`);
        }
        failed++;
      }
    }
  }

  const total = passed + failed;
  console.log(`\n${'─'.repeat(40)}`);
  console.log(`  ${passed} / ${total} passed${failed > 0 ? `  (${failed} failed)` : ''}`);

  if (failed > 0) process.exit(1);
}
