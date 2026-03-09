#!/usr/bin/env ts-node
/**
 * AgentScope Studio CLI
 *
 * Usage:
 *   npx ts-node src/cli/index.ts <command> [flags]
 *   npm run cli -- <command> [flags]
 *
 * Commands:
 *   replay-dataset             --config <path> [--dataset <id>] [--experiment <id>]
 *   evaluate-run               --run <datasetRunId>
 *   generate-regression-report --baseline <runId> --candidate <runId>
 */

import { replayDatasetCommand }            from './commands/replay-dataset';
import { evaluateRunCommand }              from './commands/evaluate-run';
import { generateRegressionReportCommand } from './commands/generate-regression-report';

// ── Argument parser ───────────────────────────────────────────────────────────
//
// Parses "-- flag value" pairs from argv.  Does not use any third-party
// library so there are no extra dependencies.

function parseArgv(argv: string[]): {
  command: string;
  flags: Record<string, string>;
} {
  const [command = '', ...rest] = argv;
  const flags: Record<string, string> = {};

  for (let i = 0; i < rest.length; i++) {
    const token = rest[i];
    if (token.startsWith('--') && i + 1 < rest.length && !rest[i + 1].startsWith('--')) {
      flags[token.slice(2)] = rest[i + 1];
      i++; // consume the value token
    }
  }

  return { command, flags };
}

// ── Help ──────────────────────────────────────────────────────────────────────

function printHelp(): void {
  console.log(`
AgentScope Studio CLI

Usage:
  agentscope <command> [flags]

Commands:
  replay-dataset
    --config <path>          Path to dataset config JSON (required)
    --dataset <id>           Override datasetId from config
    --experiment <id>        Experiment context label (informational)

  evaluate-run
    --run <datasetRunId>     Run ID to evaluate (required)

  generate-regression-report
    --baseline <runId>       Baseline evaluation run ID (required)
    --candidate <runId>      Candidate evaluation run ID (required)

Exit codes:
  0  Success / no regressions beyond thresholds
  1  Regression threshold exceeded or fatal error
`.trim());
}

// ── Dispatch ──────────────────────────────────────────────────────────────────

async function main(): Promise<void> {
  // process.argv = ['node', 'index.ts', <command>, ...flags]
  const { command, flags } = parseArgv(process.argv.slice(2));

  switch (command) {
    case 'replay-dataset':
      await replayDatasetCommand(flags);
      break;

    case 'evaluate-run':
      await evaluateRunCommand(flags);
      break;

    case 'generate-regression-report':
      await generateRegressionReportCommand(flags);
      break;

    case 'help':
    case '--help':
    case '-h':
    case '':
      printHelp();
      break;

    default:
      console.error(`Unknown command: "${command}"\nRun with no arguments or "help" to see usage.`);
      process.exit(1);
  }
}

main().catch((err: unknown) => {
  console.error('Unhandled error:', err instanceof Error ? err.message : String(err));
  process.exit(1);
});
