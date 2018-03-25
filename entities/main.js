'use strict';

global.HD = 1;

var fs = require('fs');
var path = require('path');
var O = require('../framework');
var media = require('../media');
var fsRec = require('../fs-recursive');
var formatNumber = require('../format-number');
var entities = require('./entities.js');

var entsExportDir = 'D:/Projects/JavaScript/Entities';

var clans = entities.clans;
var ents = [];

var FONT_SIZE = HD ? 32 : 16;
var FONT_OFFSET = 5;

const RADIUS = HD ? 5 : 4;
const DIAMETER = RADIUS * 2;

global.CAPTION_BOX_WIDTH = 250;
global.CAPTION_BOX_HEIGHT = FONT_OFFSET * 2 + clans.length * FONT_SIZE;
global.MAX_SPEED = HD ? 3 : 3;

var w = HD ? 1920 : 640;
var h = HD ? 1080 : 480;
var fps = 60;
var hd = true;
var duration = HD ? 20 : 20;
var framesNum = fps * duration;

var [wh, hh] = [w, h].map(a => a >> 1);

var cols = {
  bg: 'darkgray',
  text: 'black',
};

setTimeout(main);

function main(){
  media.renderVideo('-vid/2.mp4', w, h, fps, hd, (w, h, g, f) => {
    media.logStatus(f, framesNum);

    if(f === 1){
      g.textBaseline = 'top';
      g.textAlign = 'left';

      initEnts(g, ents);
    }

    g.fillStyle = cols.bg;
    g.fillRect(0, 0, w, h);

    var startIndex = (f - 1) % ents.length;
    var endIndex = (startIndex + ents.length - 1) % ents.length;

    for(var i = 0; i < ents.length; i++){
      ents[i].draw(f);
    }

    for(var i = startIndex; ; i = i !== ents.length - 1 ? i + 1 : 0){
      ents[i].tick(f);
      if(i === endIndex) break;
    }

    drawClans(g, ents);

    return f !== framesNum;
  }, onRenderingDone);
}

function initEnts(g, ents){
  var num = 100;
  var rad = (RADIUS * num) / O.pi;

  O.repeat(4, clan => {
    var xx = [w * .25, w * .75][clan & 1];
    var yy = [h * .25, h * .75][clan >> 1];

    O.repeat(num, i => {
      var x = wh + O.randf(1) - .5;
      var y = hh + O.randf(1) - .5;
      var dir = O.randf(O.pi2);

      var ent = new entities.Player(g, ents, x, y, RADIUS, dir, clan);

      ents.push(ent);
    });
  });

  O.repeat(20, i => {
    var x = RADIUS / 2 + O.randf(w - RADIUS);
    var y = RADIUS / 2 + O.randf(h - RADIUS);

    var ent = new entities.Gem(g, ents, x, y, RADIUS / 2);
    ent.respawn();

    ents.push(ent);
  });
}

function drawClans(g, ents){
  g.fillStyle = 'white';
  g.lineWidth = 2;
  g.beginPath();
  g.rect(-FONT_OFFSET, -FONT_OFFSET, CAPTION_BOX_WIDTH + FONT_OFFSET, CAPTION_BOX_HEIGHT + FONT_OFFSET);
  g.fill();
  g.stroke();
  g.lineWidth = 1;

  g.font = `bold ${FONT_SIZE}px arial`;
  g.fillStyle = cols.text;

  clans.forEach((clan, index) => {
    var name = clan.name;
    var points = formatNumber(clan.points);

    var str = `${name}: ${points}`;

    g.fillText(str, FONT_OFFSET, FONT_OFFSET + FONT_SIZE * index);
  });
}

function onRenderingDone(){
  exportEnts(ents);
}

function exportEnts(ents){
  fsRec.createDirSync(entsExportDir);
  fsRec.deleteFilesSync(entsExportDir);
  fs.mkdirSync(entsExportDir);

  var clansDir = path.join(entsExportDir, 'Clans');
  fs.mkdirSync(clansDir);

  clans.forEach((clan, id) => {
    clan.dir = path.join(clansDir, clan.name);
    fs.mkdirSync(clan.dir);
  });

  ents.forEach(ent => {
    if(!(ent instanceof entities.Player) || ent.dead)
      return;

    var clan = ent.clan;

    var hexFileName = `${ent.id}.hex`;
    var hexFilePath = path.join(clan.dir, hexFileName);

    fs.writeFileSync(hexFilePath, ent.machine.mem.buff);

    var txtFileName = `${ent.id}.txt`;
    var txtFilePath = path.join(clan.dir, txtFileName);

    var disassembled = ent.machine.disassemble();
    fs.writeFileSync(txtFilePath, disassembled);
  });
}