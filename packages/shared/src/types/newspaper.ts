export interface EditionSummary {
  date: string;
  headline: string;
  commitHash?: string;
  formats: string[];
}

export interface EditionContent {
  date: string;
  format: string;
  content: string;
}

export interface WeeklySummary {
  date: string;
  weekStart: string;
  weekEnd: string;
  commitHash?: string;
}
