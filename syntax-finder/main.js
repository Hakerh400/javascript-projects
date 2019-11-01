'use strict';

const fs = require('fs');
const path = require('path');
const O = require('../omikron');
const finder = require('./finder');
const skipList = require('./skip-list');

const args = process.argv.slice(2);

const cwd = __dirname;

const dirs = [
  O.dirs.wamp,
  path.join(cwd, '..'),
  path.join(cwd, '../../Omikron'),
  path.join(cwd, '../../Esolangs'),
];

const codeExts = [
  'bat',
  'js',
  'php',
  'sql',
  'c',
  'cc',
  'cpp',
  'h',
  'hh',
];

const textExts = codeExts.concat([
  'txt',
  'md',
  'json',
  'htm',
  'css',
  'xml',
  'yml',
]);

if(args.length !== 1)
  O.exit('ERROR: Expected exactly one argument');

const strToFind = process.argv.slice(2).join(' ').toLowerCase();

const main = () => {
  const output = finder.find(dirs, textExts, func);

  if(output.length !== 0)
    log(output.join('\n'));
};

const func = (file, src) => {
  const dirs = file.split(/[\/\\]/);
  if(dirs.some(dir => skipList.includes(dir))) return;

  const lines = O.sanl(src);

  const index = lines.findIndex(line => {
    return line.toLowerCase().includes(strToFind);
  });

  return index + 1;
};

main();