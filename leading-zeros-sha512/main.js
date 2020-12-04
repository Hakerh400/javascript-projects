'use strict';

const fs = require('fs');
const path = require('path');
const assert = require('assert');
const O = require('../omikron');
const findLeadingZeros = require('.');

const chars = '<>+-';

const prog = '+[-->-[>>+>-----<<]<--<---]>-.>>>+.>>..+++[.>]<<<<.+++.------.<<-.>>>>+.';
const start = 2_631_860_223n;

const main = () => {
  const input = prog;
  const output = findLeadingZeros(input, chars, start);

  log(output);
};

main();