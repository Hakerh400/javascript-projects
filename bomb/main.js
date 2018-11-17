'use strict';

const HD = 1;

const fs = require('fs');
const path = require('path');
const {registerFont} = require('../canvas');
const O = require('../framework');
const media = require('../media');
const ffn = require('../ffn');
const formatTime = require('../format-time');

const FACTOR = .9;

const w = HD ? 1920 : 640;
const h = HD ? 1080 : 480;
const fps = 60;
const fast = !HD;

const [wh, hh] = [w, h].map(a => a >> 1);

const duration = 41;
const framesNum = fps * duration;

const noteDuration = 1 / 4;
const startDelay = 0.025057;

const cwd = __dirname;
const fontFamily = 'Digital-7';
const fontFile = `-dw/${fontFamily}.ttf`;
const rhythmFile = path.join(cwd, 'rhythm.txt');
const outputFile = getOutputFile(1);

setTimeout(() => main().catch(log));

process.exit = null;

async function main(){
  registerFont(ffn(fontFile), {family: fontFamily});

  const tt = 1 / (fps * noteDuration);

  var rhythm = [0, startDelay]
    .concat(fs.readFileSync(rhythmFile, 'utf8')
    .match(/ \d+/g)
    .map(t => Number(t)));

  var indexPrev = 0;
  var index = 0;

  var time = 25;
  var k = 0;

  function init(g){
    g.textBaseline = 'middle';
    g.textAlign = 'center';
  }

  media.renderVideo(outputFile, w, h, fps, fast, (w, h, g, f) => {
    media.logStatus(f, framesNum);

    if(f === 1) init(g);

    k *= FACTOR;

    var dt = rhythm[index] -= tt;
    while(dt < 0){
      if(++index === rhythm.length) return;

      dt = rhythm[index] += dt;
      if(index >= 4 && (index & 1) === 0){
        if(time !== 0) time--;
        k = 1;
      }
    }

    g.fillStyle = 'white';
    g.fillRect(0, 0, w, h);

    var text = formatTime(time).substring(3);
    g.font = `${10 + f / 10}px '${fontFamily}'`;

    g.fillStyle = '#aaa';
    g.fillText(text, wh, hh);
    g.fillStyle = new O.Color(Math.round(k * 255), 0, 0);
    g.fillText(text, wh, hh);

    return f !== framesNum;
  }, () => {
    media.spawnFfmpeg(`-i "${ffn('-dw/1.mp4')}" -i "${ffn(path.join(cwd, '../music/songs/test.mp3'))}" -y -c copy "${ffn('-vid/1.mp4')}"`);
  });
}

function getOutputFile(vid=0){
  if(vid || !HD) return '-dw/1.mp4';
  var project = path.parse(__dirname).name;
  return `-render/${project}.mp4`;
}