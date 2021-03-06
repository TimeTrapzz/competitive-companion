/// <reference types="jest-playwright-preset" />
/// <reference types="expect-playwright" />

(global as any).chrome = {
  runtime: {
    id: 'dev',
  },
};

import * as fs from 'fs';
import * as path from 'path';
import fetch from 'cross-fetch';
import { JSDOM } from 'jsdom';
import { Contest } from '../src/models/Contest';
import { Task } from '../src/models/Task';
import { Parser } from '../src/parsers/Parser';

const parserFunctions = require('./parser-functions').default;

export interface ParserTestData {
  name?: string;
  before?: string;
  url: string;
  parser: string;
  result: Task | Task[];
}

function getWebsites(): string[] {
  const directory = path.resolve(__dirname, 'data/');

  return fs.readdirSync(directory).filter(file => fs.statSync(path.join(directory, file)).isDirectory());
}

async function runTest(data: ParserTestData): Promise<void> {
  const parserObj = require(`../src/parsers/${data.parser}`);
  const parserClass = parserObj[Object.keys(parserObj)[0]];
  const parser: Parser = new parserClass();

  await page.goto(data.url, {
    timeout: 15000,
  });

  if (data.before) {
    await parserFunctions[data.before](page);
  }

  const html = await page.content();
  const url = page.url();
  const dom = new JSDOM(html, { url });

  (global as any).window = {
    ...dom.window,
    nanoBar: {
      go: (): void => {
        //
      },
    },
  };

  (global as any).DOMParser = function (): any {
    this.parseFromString = (source: string): Document => {
      return new JSDOM(source, { url }).window.document;
    };
  };

  (global as any).fetch = fetch;
  (global as any).Node = dom.window.Node;
  (global as any).document = dom.window.document;

  expect(parser.getRegularExpressions().some(r => r.test(url))).toBeTruthy();
  expect(parser.getExcludedRegularExpressions().some(r => r.test(url))).toBeFalsy();
  expect(parser.canHandlePage()).toBeTruthy();

  const result = await parser.parse(url, html);

  const expectedContest = Array.isArray(data.result);
  const resultContest = result instanceof Contest;
  expect(resultContest).toBe(expectedContest);

  const tasksToCheck: [Task, Task][] = [];

  if (resultContest) {
    const expectedTasks = data.result as Task[];
    const actualTasks = (result as Contest).tasks as Task[];

    expect(actualTasks.length).toBe(expectedTasks.length);

    for (let i = 0; i < expectedTasks.length; i++) {
      expect(actualTasks[i].batch.id).toBe(actualTasks[0].batch.id);
      expect(actualTasks[i].batch.size).toBe(actualTasks.length);

      tasksToCheck.push([expectedTasks[i], actualTasks[i]]);
    }
  } else {
    const expectedTask = data.result as Task;
    const actualTask = result as Task;

    expect(actualTask.batch.size).toBe(1);

    tasksToCheck.push([expectedTask, actualTask]);
  }

  for (const [expectedTask, actualTask] of tasksToCheck) {
    delete expectedTask.batch;
    delete actualTask.batch;

    expect(actualTask).toEqual(expectedTask);
  }
}

function runTests(website: string, type: string): void {
  const directory = path.resolve(__dirname, `data/${website}/${type}/`);

  if (!fs.existsSync(directory)) {
    return;
  }

  const tests: ParserTestData[] = fs
    .readdirSync(directory)
    .map(file => path.join(directory, file))
    .filter(file => fs.statSync(file).isFile())
    .map(file => {
      const data: ParserTestData = require(file);

      data.name = path.basename(file, '.json');

      data.result = Array.isArray(data.result)
        ? data.result.map((t: any) => Task.fromJSON(JSON.stringify(t)))
        : Task.fromJSON(JSON.stringify(data.result));

      return data;
    });

  describe(type, () => {
    tests.forEach(data => {
      test(data.name, () => {
        return runTest(data);
      });
    });
  });
}

jest.setTimeout(30000);

getWebsites().forEach(website => {
  describe(website, () => {
    runTests(website, 'problem');
    runTests(website, 'contest');
  });
});
