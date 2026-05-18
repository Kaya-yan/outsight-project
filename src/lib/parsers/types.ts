export interface ParserOutput {
  plainText: string;
  wordCount: number;
  metadata: {
    title?: string;
    author?: string;
    date?: string;
  };
  parserName: string;
  warnings: string[];
}

export type ParserFn = (buffer: ArrayBuffer, fileName: string) => Promise<ParserOutput>;
