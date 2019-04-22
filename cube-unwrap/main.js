'use strict';

const fs = require('fs');
const path = require('path');
const util = require('util');
const http = require('http');
const https = require('https');
const net = require('net');
const urlm = require('url');
const stream = require('stream')
const cp = require('child_process');
const EventEmitter = require('events');
const readline = require('readline');
const crypto = require('crypto');
const O = require('../omikron');
const media = require('../media');
const ImageData = require('../image-data');
const fsRec = require('../fs-rec');
const format = require('../format');
const Table = require('../table');

media.editImage('-wamp/projects/simulator/textures/sky.png', '-img/1.png', (w, h, g) => {
  const d = new ImageData(g);
  const col = Buffer.alloc(3);

  const s = w >> 2;

  d.iter((x, y) => {
    if(x === 0) media.logStatus(y + 1, h, 'row');

    if(y < s){
      if(x < s) return d.get(s, Math.max(y - (s - 1 - x), 0), col);
      if(x >= s * 2 && x < s * 3) return d.get(s * 2 - 1, Math.max(y - (x - s * 2), 0), col);
      if(x >= s * 3) return d.get(O.bound(s + (w - 1 - x) - (s - y) * 2, s, s * 2 - 1), 0, col);
      return;
    }

    if(y >= s * 2){
      if(x < s) return d.get(s, Math.min(y + (s - 1 - x), h - 1), col);
      if(x >= s * 2 && x < s * 3) return d.get(s * 2 - 1, Math.min(y + (x - s * 2), h - 1), col);
      if(x >= s * 3) return d.get(O.bound(s + (w - 1 - x) - (y - s * 2) * 2, s, s * 2 - 1), h - 1, col);
    }
  });

  d.put();
});