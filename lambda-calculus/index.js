'use strict';

const fs = require('fs');
const path = require('path');
const O = require('../omikron');

const G = (...a) => (a.a = 0, a);
const F = (...a) => (a.a = 1, a);

module.exports = {
  G, F,

  prepare,
  expand,

  reduce,
  reduceStep,
  cmp,
  cmpRaw,

  copy,
  map,
  vec,

  str,
  show,
};

function prepare(expr){
  expr = copy(expr);
  if(expr.a) expr = G(expr);
  return expr;
}

function expand(expr){
  const group = expr.shift();

  for(let i = group.length - 1; i !== -1; i--)
    expr.unshift(group[i]);

  return expr;
}

function reduce(expr, clever=0){
  expr = prepare(expr);

  const history = clever ? [copy(expr)] : null;

  while(reduceStep(expr)){
    if(clever){
      for(const h of history){
        if(expr.length < h.length) continue;
        if(expr.every((e, i) => cmpRaw(e, h[i]))) return null;
      }

      history.push(copy(expr));
    }
  }

  return expr;
}

function reduceStep(expr){
  while(!expr[0].a) expand(expr);

  while(expr.length === 1){
    expr = expr[0];
    if(!vec(expr[0])) return 0;
    while(!expr[0].a) expand(expr);
  }

  const func = expr.shift();
  const arg = expr.shift();

  const subst = (nest, e) => {
    if(!vec(e)){
      if(e === nest) return arg;
      return e;
    }

    nest += e.a;

    return map(e, e => subst(nest, e));
  };

  for(let i = func.length - 1; i !== -1; i--)
    expr.unshift(subst(0, func[i]));

  return 1;
}

function cmp(expr1, expr2, clever=0){
  {
    const e1 = reduce(expr1, clever);
    const e2 = reduce(expr2, clever);

    if(e1 !== null && e2 !== null) return cmpRaw(e1, e2);
    if(e1 !== null || e2 !== null) return 0;
  }

  expr1 = prepare(expr1);
  expr2 = prepare(expr2);

  const history1 = [copy(expr1)];
  const history2 = [copy(expr2)];

  while(1){
    reduceStep(expr1);
    reduceStep(expr2);

    history1.push(copy(expr1));
    history2.push(copy(expr2));

    if(history1.some(h => cmpRaw(h, expr2))) return 1;
    if(history2.some(h => cmpRaw(h, expr1))) return 1;
  }

  return cmpRaw(expr1, expr2);
}

function cmpRaw(e1, e2){
  if(!(vec(e1) && vec(e2))) return e1 === e2;
  return e1.length === e2.length && e1.every((e, i) => {
    return cmpRaw(e, e2[i]);
  });
}

function copy(expr){
  if(!vec(expr)) return expr;
  const map = expr.map(copy);
  map.a = expr.a;
  return map;
}

function map(expr, func){
  const m = expr.map(func);
  m.a = expr.a;
  return m;
}

function vec(e){
  return Array.isArray(e);
}

function str(expr, top=0){
  if(!vec(expr)) return String(expr);
  const p = expr.a || !(top || expr.length === 1) ? expr.a ? ['(', ')'] : ['[', ']'] : ['', ''];
  return `${p[0]}${expr.map(e => str(e, expr.a)).join(' ')}${p[1]}`;
}

function show(expr){
  log(str(expr));
}