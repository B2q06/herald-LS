import { Command } from 'commander';
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';
import { generateZshCompletions } from '../completion/zsh.ts';

/**
 * Detect the current shell from the SHELL environment variable.
 */
export function detectShell(): string | null {
  const shell = process.env.SHELL;
  if (!shell) return null;
  return path.basename(shell);
}

/**
 * Get the completion script for the given shell.
 * Currently only zsh is supported.
 */
export function getCompletionScript(shell: string): string | null {
  switch (shell) {
    case 'zsh':
      return generateZshCompletions();
    default:
      return null;
  }
}

/**
 * Get the shell config file path for installing completions.
 */
export function getShellConfigPath(shell: string): string | null {
  const home = os.homedir();
  switch (shell) {
    case 'zsh':
      return path.join(home, '.zshrc');
    default:
      return null;
  }
}

/**
 * Get the completion file path for the given shell.
 */
export function getCompletionFilePath(shell: string): string | null {
  const home = os.homedir();
  switch (shell) {
    case 'zsh': {
      const dir = path.join(home, '.herald', 'completions');
      return path.join(dir, '_herald');
    }
    default:
      return null;
  }
}

const FPATH_LINE = 'fpath=(~/.herald/completions $fpath)';
const COMPINIT_LINE = 'autoload -Uz compinit && compinit';

export function createCompletionsCommand(): Command {
  return new Command('completions')
    .description('Generate shell completions')
    .option('--install', 'Install completions to shell config')
    .option('--shell <shell>', 'Specify shell (default: auto-detect from SHELL env)')
    .action(async (opts: { install?: boolean; shell?: string }) => {
      const shell = opts.shell ?? detectShell();

      if (!shell) {
        console.error('Error: Could not detect shell. Use --shell to specify one.');
        process.exit(1);
        return;
      }

      const script = getCompletionScript(shell);

      if (!script) {
        console.error(`Error: Shell "${shell}" is not supported. Supported shells: zsh`);
        process.exit(1);
        return;
      }

      if (!opts.install) {
        // Just output the completion script to stdout
        console.log(script);
        return;
      }

      // Install mode: write the completion file and update shell config
      const completionFile = getCompletionFilePath(shell);
      const configFile = getShellConfigPath(shell);

      if (!completionFile || !configFile) {
        console.error(`Error: Cannot determine install paths for shell "${shell}".`);
        process.exit(1);
        return;
      }

      // Create the completion directory
      const completionDir = path.dirname(completionFile);
      fs.mkdirSync(completionDir, { recursive: true });

      // Write the completion script
      fs.writeFileSync(completionFile, script, 'utf-8');
      console.log(`Wrote completion script to ${completionFile}`);

      // Check if fpath and compinit are already in the shell config
      let configContent = '';
      try {
        configContent = fs.readFileSync(configFile, 'utf-8');
      } catch {
        // Config file doesn't exist, will create it
      }

      let modified = false;

      if (!configContent.includes('.herald/completions')) {
        configContent += `\n# Herald CLI completions\n${FPATH_LINE}\n`;
        modified = true;
      }

      if (!configContent.includes('compinit')) {
        configContent += `${COMPINIT_LINE}\n`;
        modified = true;
      }

      if (modified) {
        fs.writeFileSync(configFile, configContent, 'utf-8');
        console.log(`Updated ${configFile}`);
      }

      console.log('');
      console.log('Completions installed. Restart your shell or run:');
      console.log(`  source ${configFile}`);
    });
}
