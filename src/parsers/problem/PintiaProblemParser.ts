import { Sendable } from '../../models/Sendable';
import { TaskBuilder } from '../../models/TaskBuilder';
import { htmlToElement } from '../../utils/dom';
import { Parser } from '../Parser';

export class PintiaProblemParser extends Parser {
  public getMatchPatterns(): string[] {
    return ['https://pintia.cn/problem-sets/*/problems/*'];
  }

  public async parse(url: string, html: string): Promise<Sendable> {
    const elem = htmlToElement(html);
    const task = new TaskBuilder('Pintia').setUrl(url);

    task.setName(elem.querySelector('.my-4').textContent);

    const content = elem.querySelector('div[class^="problemInfo"]');
    task.setTimeLimit(parseInt(content.childNodes[content.childNodes.length - 3].textContent.replace(/[^0-9]/gi, '')));
    task.setMemoryLimit(
      parseInt(content.childNodes[content.childNodes.length - 2].textContent.replace(/[^0-9]/gi, '')),
    );

    const input = elem.querySelectorAll('.language-in');
    const output = elem.querySelectorAll('.language-out');
    for (let i = 0; i < input.length; i++) {
      task.addTest(input[i].textContent, output[i].textContent);
    }

    return task.build();
  }
}
