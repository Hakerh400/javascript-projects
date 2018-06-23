'use strict';

var O = require('../framework');
var media = require('../media');
var conv = require('../color-converter');

const ENTS_NUM = 1e4;
const DIAMETER = .75;
const SPEED_MIN = .05;
const SPEED_MAX = .1;

const RADIUS = DIAMETER / 2;

var w = 1920;
var h = 1080;
var fps = 60;
var fast = 0;

var duration = 60 * 60;
var framesNum = fps * duration;

var s = 40;
var [ws, hs] = [w, h].map(a => a / s | 0);
var [ws1, hs1] = [ws, hs].map(a => a - 1);

var cols = {
  bg: conv.color('darkgray'),
  wall: conv.color('#808080'),
};

setTimeout(main);

function main(){
  var world;

  media.renderVideo('-vid/1.mp4', w, h, fps, fast, (w, h, g, f) => {
    media.logStatus(f, framesNum);

    if(f === 1){
      world = createWorld(g);
    }

    world.draw();
    world.tick();

    return f !== framesNum;
  });
}

function createWorld(g){
  g = new O.EnhancedRenderingContext(g);

  var grid = new Grid(ws, hs, (x, y) => {
    var wall = 0;

    if(x === 0 || y === 0 || x === ws1 || y === hs1) wall = 1;
    else if(x <= 2 && y <= 2) wall = 0;
    else wall = O.rand(20) === 0;

    return new Block(wall);
  });

  var ents = O.ca(ENTS_NUM, i => {
    var x = 1.5;
    var y = 1.5;
    var speed = SPEED_MIN + O.randf(SPEED_MAX - SPEED_MIN);
    var dir = O.rand(2) ? 2 : 3;
    var col = O.Color.from(O.hsv(O.randf(1)));

    return new Entity(x, y, speed, dir, col);
  });

  return new World(grid, ents, g);
}

class World{
  constructor(grid, ents, g){
    this.grid = grid;
    this.ents = ents;
    this.g = g;

    grid.world = this;
    ents.forEach(ent => ent.world = this);
  }

  tick(){
    var {grid, ents} = this;

    grid.tick();
    ents.forEach(ent => ent.tick());
  }

  draw(){
    var {grid, ents, g} = this;

    g.fillStyle = cols.bg;
    g.fillRect(0, 0, w, h);

    g.scale(s, s);
    grid.draw(g);
    ents.forEach(ent => ent.draw(g));
    g.resetTransform();
  }
};

class Grid{
  constructor(w, h, func=O.nop){
    this.world = null;

    this.w = w;
    this.h = h;

    this.d = O.ca(h, y => {
      return O.ca(w, x => {
        return func(x, y);
      });
    });
  }

  includes(x, y){
    return x >= 0 && x < this.w && y >= 0 && y < this.h;
  }

  get(x, y){
    if(!this.includes(x, y)) return null;
    return this.d[y][x];
  }

  set(x, y, val){
    if(!this.includes(x, y)) return;
    this.d[y][x] = val;
  }

  iterate(func){
    var {w, h, d} = this;

    for(var y = 0; y < h; y++){
      var row = d[y];
      for(var x = 0; x < w; x++)
        func(x, y, row[x]);
    }
  }

  tick(){}

  draw(g){
    this.iterate((x, y, d) => {
      if(d.wall){
        g.fillStyle = cols.wall;
        g.beginPath();
        g.rect(x, y, 1, 1);
        g.fill();
        g.stroke();
      }
    });
  }
};

class Block{
  constructor(wall){
    this.wall = wall;
  }
};

class Entity extends O.Vector{
  constructor(x, y, speed, dir, col){
    super(x, y);

    this.world = null;

    this.speed = speed;
    this.dir = dir;
    this.col = col;

    this.pathDist = 0;
  }

  tick(){
    var {world, speed} = this;
    var {grid, ents} = world;

    var dx = 0;
    var dy = 0;

    switch(this.dir){
      case 0: dy = -1; break;
      case 1: dx = -1; break;
      case 2: dy = 1; break;
      case 3: dx = 1; break;
    }

    this.add(dx * speed, dy * speed);
    this.pathDist += speed;

    if(this.pathDist > 1){
      if(grid.get(Math.floor(this.x + dx), Math.floor(this.y + dy)).wall){
        var dirs = [];

        if(!grid.get(Math.floor(this.x), Math.floor(this.y - 1)).wall) dirs.push(0);
        if(!grid.get(Math.floor(this.x - 1), Math.floor(this.y)).wall) dirs.push(1);
        if(!grid.get(Math.floor(this.x), Math.floor(this.y + 1)).wall) dirs.push(2);
        if(!grid.get(Math.floor(this.x + 1), Math.floor(this.y)).wall) dirs.push(3);

        this.dir = O.randElem(dirs);
        this.x = Math.floor(this.x) + .5;
        this.y = Math.floor(this.y) + .5;
        this.pathDist = 0;
      }else{
        this.pathDist -= 1;
      }
    }
  }

  draw(g){
    var {x, y, col} = this;

    g.fillStyle = col;
    g.beginPath();
    g.arc(x, y, RADIUS, 0, O.pi2);
    g.fill();
    g.stroke();
  }
};