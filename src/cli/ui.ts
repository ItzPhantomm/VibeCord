import pc from 'picocolors';
import Table from 'cli-table3';

export const UI = {
  // Brand colors & typography
  lime: (str: string | number) => pc.bold(pc.green(String(str))),
  dim: (str: string | number) => pc.dim(String(str)),
  cyan: (str: string | number) => pc.cyan(String(str)),
  yellow: (str: string | number) => pc.yellow(String(str)),
  red: (str: string | number) => pc.red(String(str)),
  white: (str: string | number) => pc.white(String(str)),

  // Badges
  badgeSuccess: (label: string = 'SUCCESS') => pc.bgGreen(pc.black(` ${label} `)),
  badgeError: (label: string = 'ERROR') => pc.bgRed(pc.white(` ${label} `)),
  badgeWarn: (label: string = 'WARN') => pc.bgYellow(pc.black(` ${label} `)),
  badgeInfo: (label: string = 'INFO') => pc.bgCyan(pc.black(` ${label} `)),
  badgeDestructive: () => pc.bgRed(pc.white(' DESTRUCTIVE ')),
  badgeReadOnly: () => pc.bgBlue(pc.white(' READ-ONLY ')),

  // Symbols
  check: pc.green('✔'),
  cross: pc.red('✖'),
  warn: pc.yellow('⚠'),
  bullet: pc.dim('•'),
  arrow: pc.green('→'),
  bolt: pc.green('⚡'),

  // Header Banner
  banner(version: string = '1.0.0') {
    const line = pc.dim('─'.repeat(60));
    console.log();
    console.log(` ${pc.bold(pc.green('⚡ DISCORD BRIDGE'))} ${pc.dim(`v${version}`)}`);
    console.log(` ${pc.dim('Universal Discord control layer for AI coding harnesses')}`);
    console.log(` ${line}`);
    console.log();
  },

  section(title: string) {
    console.log(`\n ${pc.bold(pc.white(title))}`);
    console.log(` ${pc.dim('─'.repeat(Math.max(30, title.length + 8)))}`);
  },

  successMessage(msg: string) {
    console.log(` ${pc.green('✔')} ${msg}`);
  },

  errorMessage(msg: string) {
    console.log(` ${pc.red('✖')} ${msg}`);
  },

  warnMessage(msg: string) {
    console.log(` ${pc.yellow('⚠')} ${msg}`);
  },

  infoMessage(msg: string) {
    console.log(` ${pc.cyan('ℹ')} ${msg}`);
  },

  table(head: string[], rows: (string | number)[][]): string {
    const table = new Table({
      head: head.map(h => pc.bold(pc.white(h))),
      chars: {
        top: pc.dim('─'),
        'top-mid': pc.dim('┬'),
        'top-left': pc.dim('┌'),
        'top-right': pc.dim('┐'),
        bottom: pc.dim('─'),
        'bottom-mid': pc.dim('┴'),
        'bottom-left': pc.dim('└'),
        'bottom-right': pc.dim('┘'),
        left: pc.dim('│'),
        'left-mid': pc.dim('├'),
        mid: pc.dim('─'),
        'mid-mid': pc.dim('┼'),
        right: pc.dim('│'),
        'right-mid': pc.dim('┤'),
        middle: pc.dim('│'),
      },
      style: {
        head: [],
        border: [],
        compact: true,
      },
    });

    for (const row of rows) {
      table.push(row);
    }

    return table.toString();
  },

  box(content: string, options: { title?: string; borderColor?: (s: string) => string } = {}) {
    const color = options.borderColor || pc.dim;
    const lines = content.split('\n');
    const maxLen = Math.max(...lines.map(l => l.replace(/\u001b\[[0-9;]*m/g, '').length), (options.title?.length ?? 0) + 4);
    const width = maxLen + 4;

    const topBorder = options.title
      ? color('┌─ ') + pc.bold(options.title) + color(' ' + '─'.repeat(Math.max(0, width - (options.title.length + 4))) + '┐')
      : color('┌' + '─'.repeat(width) + '┐');
    const bottomBorder = color('└' + '─'.repeat(width) + '┘');

    console.log(topBorder);
    for (const line of lines) {
      const cleanLen = line.replace(/\u001b\[[0-9;]*m/g, '').length;
      const pad = ' '.repeat(Math.max(0, width - cleanLen - 2));
      console.log(`${color('│')}  ${line}${pad}${color('│')}`);
    }
    console.log(bottomBorder);
  },
};
