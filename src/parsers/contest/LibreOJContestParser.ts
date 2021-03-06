import { Parser } from '../Parser';
import { LibreOJProblemParser } from '../problem/LibreOJProblemParser';
import { SimpleContestParser } from '../SimpleContestParser';

export class LibreOJContestParser extends SimpleContestParser {
  public linkSelector: string = '.ui.selectable.celled.table > tbody > tr > td:nth-child(2) > a';
  public problemParser: Parser = new LibreOJProblemParser();

  public getMatchPatterns(): string[] {
    return ['https://libreoj.github.io/contest/*'];
  }
}
