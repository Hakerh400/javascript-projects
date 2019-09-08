'use strict';

const fs = require('fs');
const path = require('path');
const O = require('../omikron');
const Memory = require('./memory');

const run = (src, input) => {
  src = src.toString();

  const err = msg => {
    O.exit(`ERROR: ${msg}`);
  };

  const str2arr = str => {
    return str.split('').map(a => a | 0);
  };

  const transfs = [];

  O.tokenize(src, [
    /\s+/, O.nop,

    /(\<?[01]*\>?)\s*\-\s*([01]*);?/, (str, gs) => {
      const find = gs[0];
      const replace = gs[1];

      transfs.push([
        str2arr(find.replace(/[\<\>]/g, '')),
        str2arr(replace.replace(/[\<\>]/g, '')),
        find.startsWith('<'),
        find.endsWith('>'),
      ]);
    },

    (str, gs) => {
      err(`Invalid syntax near ${O.sf(str)}`);
    },
  ]);

  const io = new O.IO(input, 0, 1);
  const inputBits = [0, 0];
  // while(io.read()) inputBits.push(io.read());
  for(const bit of input) inputBits.push(bit & 1);

  const mem = new Memory(inputBits);
  mem.replace(transfs);

  for(let i = 0; i !== 2; i++)
    if(mem.first !== null)
      mem.shift();

  for(const bit of mem)
    io.write(bit);

  // return io.getOutput();
  return mem.toString();;
};

module.exports = run;