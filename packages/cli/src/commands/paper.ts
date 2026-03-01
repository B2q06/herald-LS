import { Command } from 'commander';
import { get } from '../utils/api-client.ts';

interface CurrentEditionResponse {
  editionDate: string;
  content: string;
}

interface EditionsResponse {
  editions: Array<{
    date: string;
    headline?: string;
    summary?: string;
  }>;
}

interface EditionDetailResponse {
  editionDate: string;
  content: string;
}

interface WeeklyListResponse {
  weekly: Array<{
    date: string;
    headline?: string;
    summary?: string;
  }>;
}

interface WeeklyDetailResponse {
  date: string;
  content: string;
}

export function createPaperCommand(): Command {
  return new Command('paper')
    .description('View the Herald newspaper')
    .option('--json', 'Output raw JSON')
    .option('--history', 'List past editions')
    .option('--date <date>', 'View a specific edition by date (YYYY-MM-DD)')
    .option('--weekly', 'View latest weekly synthesis')
    .action(async (opts: { json?: boolean; history?: boolean; date?: string; weekly?: boolean }) => {
      try {
        // --history: list past editions
        if (opts.history) {
          const data = await get<EditionsResponse>('/api/newspaper/editions');

          if (opts.json) {
            console.log(JSON.stringify(data, null, 2));
            return;
          }

          if (data.editions.length === 0) {
            console.log('No editions found.');
            return;
          }

          console.log('Herald Editions');
          console.log('===============');
          console.log('');

          for (const edition of data.editions) {
            const summary = edition.headline || edition.summary || '';
            const line = summary ? `  ${edition.date}  ${summary}` : `  ${edition.date}`;
            console.log(line);
          }

          console.log('');
          console.log(`${data.editions.length} edition(s)`);
          return;
        }

        // --date <YYYY-MM-DD>: view specific edition
        if (opts.date) {
          if (!/^\d{4}-\d{2}-\d{2}$/.test(opts.date)) {
            console.error('Error: Invalid date format. Expected YYYY-MM-DD (e.g. 2026-03-01).');
            process.exit(1);
            return;
          }
          // Validate calendar correctness (reject month 13, day 32, etc.)
          const [y, m, d] = opts.date.split('-').map(Number);
          const parsed = new Date(y, m - 1, d);
          if (parsed.getFullYear() !== y || parsed.getMonth() !== m - 1 || parsed.getDate() !== d) {
            console.error('Error: Invalid date format. Expected YYYY-MM-DD (e.g. 2026-03-01).');
            process.exit(1);
            return;
          }
          const data = await get<EditionDetailResponse>(`/api/newspaper/editions/${opts.date}`);

          if (opts.json) {
            console.log(JSON.stringify(data, null, 2));
            return;
          }

          console.log(`Herald - ${data.editionDate}`);
          console.log('='.repeat(`Herald - ${data.editionDate}`.length));
          console.log('');
          console.log(data.content);
          return;
        }

        // --weekly: view latest weekly synthesis
        if (opts.weekly) {
          const data = await get<WeeklyListResponse>('/api/newspaper/weekly');

          if (opts.json) {
            console.log(JSON.stringify(data, null, 2));
            return;
          }

          if (data.weekly.length === 0) {
            console.log('No weekly editions found.');
            return;
          }

          // Show the latest weekly edition content
          const latest = data.weekly[0];
          const detail = await get<WeeklyDetailResponse>(`/api/newspaper/weekly/${latest.date}`);

          console.log(`Herald Weekly - ${detail.date}`);
          console.log('='.repeat(`Herald Weekly - ${detail.date}`.length));
          console.log('');
          console.log(detail.content);
          return;
        }

        // Default: show today's edition
        const data = await get<CurrentEditionResponse>('/api/newspaper/current');

        if (opts.json) {
          console.log(JSON.stringify(data, null, 2));
          return;
        }

        console.log(`Herald - ${data.editionDate}`);
        console.log('='.repeat(`Herald - ${data.editionDate}`.length));
        console.log('');
        console.log(data.content);
      } catch (err) {
        console.error(`Error: ${(err as Error).message}`);
        process.exit(1);
      }
    });
}
