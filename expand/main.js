'use strict';

const HD = 1;
const SCALE = !HD;
const WAIT_AFTER_END = HD;
const RANDOM = 0;

const fs = require('fs');
const path = require('path');
const O = require('../omikron');
const media = require('../media');
const Presentation = require('../presentation');
const ImageData = require('../image-data');

const TIME_TO_WAIT = 5e3;

const wt = HD ? 1920 : 640;
const ht = HD ? 1080 : 480;

const fps = 60;
const fast = !HD;

const inputFile = '-dw/1.png';
const outputFile = getOutputFile();

setTimeout(() => main().catch(log));

async function main(){
  var img = await media.loadImage(inputFile);
  if(SCALE) img = media.scale(img, wt, ht);

  const {canvas} = img;
  const pr = new Presentation(canvas.width, canvas.height, fps, fast);
  pr.verbose = 0;

  const col = Buffer.alloc(3);

  await pr.render(outputFile, async (w, h, g, g1) => {
    const [wh, hh] = [w, h].map(a => a >> 1);
    const start = [w, h].map(a => O.rand(a));

    const pixelsNum = w * h;
    var pixelsDone = 0;

    const dImg = new ImageData(img);

    const d = new O.SimpleGrid(w, h, (x, y) => {
      dImg.get(x, y, col);

      var v = Math.round((col[0] + col[1] + col[2]) / 3);
      v = v ** 2 >> 8;

      return v;
    });

    const dPix = new O.SimpleGrid(w, h, () => 0);
    const dg = new ImageData(g);

    dg.iterate((x, y) => {
      var v = d.get(x, y);
      return [v, v, v];
    });

    dg.put();
    await pr.frame();

    dPix.set(...start, 1);
    const queue = [[[...start]]];

    var epoch = -1;

    while(queue.length !== 0){
      epoch++;

      var elems = queue.shift();
      if(elems.length === 0) continue;

      media.logStatus(pixelsDone + 1, pixelsNum, 'pixel');

      var k = epoch / (256 * 6);
      O.hsv(k % 1, col);

      for(var [x, y] of elems){
        dg.set(x, y, col);
        pixelsDone++;

        d.adj(x, y, (x, y, v) => {
          if(!d.has(x, y) || dPix.get(x, y)) return;
          dPix.set(x, y, 1);

          v += 2;
          if(RANDOM) v = O.rand(v);
          else v >>= 1;

          while(v >= queue.length) queue.push([]);
          queue[v].push([x, y]);
        });
      }

      dg.put();
      await pr.frame();
    }

    if(WAIT_AFTER_END)
      await pr.wait(TIME_TO_WAIT);
  });
}

function getOutputFile(vid=0){
  if(vid || !HD) return '-vid/1.mp4';
  var project = path.parse(__dirname).name;
  return `-render/${project}.mp4`;
}