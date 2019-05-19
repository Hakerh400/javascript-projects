'use strict';

const fs = require('fs');
const path = require('path');
const O = require('../../../omikron');
const SG = require('../../../serializable-graph');
const SF = require('../../stack-frame');
const cgs = require('../../common-graph-nodes');
const InterpreterBase = require('../../interpreter-base');

const IDENTS_NUM = 9;

class Interpreter extends InterpreterBase{
  static ptrsNum = this.keys(['globInv']);
  static identsNum = IDENTS_NUM;

  constructor(g, script){
    super(g, script);
    if(g.dsr) return;

    this.globInv = null;
  }

  get zero(){
    return this.globInv.getIdentByIndex(0);
  }
}

class List extends SG.Node{
  static ptrsNum = this.keys(['ident', 'arg', 'next']);

  constructor(g, ident=null, arg=null, next=null){
    super(g, ident);
    if(g.dsr) return;

    this.ident = ident;
    this.arg = arg;
    this.next = next;
  }

  get val(){ return this.ident; }
  set val(val){ this.ident = val; }

  static from(list){ return list !== null ? new this(list.g, list.ident, list.arg, list.next) : null; }
  clone(){ return this.constructor.from(this); }
  from(list){ this.ident = list.ident; this.arg = list.arg; this.next = list.next; return this; }
  copy(list){ list.ident = this.ident; list.arg = this.arg; list.next = this.next; return list; }
}

class Argument extends SG.Node{
  static ptrsNum = this.keys(['list', 'next']);

  constructor(g, list=null, next=null){
    super(g, list);
    if(g.dsr) return;

    this.list = list;
    this.next = next;
  }

  static from(arg){ return arg !== null ? new this(arg.g, arg.arg, arg.next) : null; }
  clone(){ return this.constructor.from(this); }
  from(arg){ this.list = arg.list; this.next = arg.next; return this; }
  copy(arg){ arg.list = this.list; arg.next = this.next; return arg; }
}

class EvaluatedArguments extends cgs.Array{
  has(index){
    return index < this.length;
  }

  get(index){
    if(index >= this.length) return this.g.intp.zero;
    return this[index];
  }
}

class Invocation extends SF{
  static ptrsNum = this.keys(['parent', 'idents']);

  constructor(g, parent=null, idents=null){
    super(g, parent);
    if(g.dsr) return;

    this.parent = parent;
    this.idents = idents;
  }

  invoke(args){ O.virtual('invoke'); }

  getIdentByIndex(index){
    const {arr} = this.idents;

    if(index >= arr.length) return null;
    return arr[index][1];
  }

  getIdent(ident){
    for(let inv = this; inv !== null; inv = inv.parent){
      const {idents} = inv;

      if(idents !== null && idents.has(ident))
        return idents.get(ident);
    }

    return this.intp.zero;
  }

  setIdent(ident, val){
    for(let inv = this; inv !== null; inv = inv.parent){
      const {idents} = inv;

      if(idents !== null && idents.has(ident))
        return idents.set(ident, val);
    }

    return this.intp.globInv.createIdent(ident, val);
  }

  createIdent(ident, val){
    if(this.idents === null)
      this.idents = new cgs.Map(this.g);

    this.idents.set(ident, val);
  }
}

class GlobalInvocation extends Invocation{
  static ptrsNum = this.keys(['elem']);

  constructor(g, idents=null, list=null){
    super(g, null, idents);
    if(g.dsr) return;

    const elem = this.elem = List.from(list);
    if(elem !== null) elem.ident = this.getIdent(elem.ident);
  }

  tick(th){
    const {elem} = this;

    if(elem === null) return th.ret(null);

    if(elem.arg === null){
      const e = this.elem = List.from(elem.next);
      if(e !== null) e.val = this.getIdent(e.ident);
      return;
    }

    if(this.nval) return th.call(elem.val.invoke(elem.arg));
    elem.val = this.gval;
    elem.arg = elem.arg.next;
  }
}

class ArgumentsInvocation extends Invocation{
  static ptrsNum = this.keys(['elem', 'eargs']);

  constructor(g, parent=null, list=null){
    super(g, parent, null);
    if(g.dsr) return;

    const elem = this.elem = List.from(list);
    if(elem !== null) elem.ident = this.getIdent(elem.ident);

    this.eargs = new EvaluatedArguments(g);
  }

  tick(th){
    const {elem, eargs} = this;

    if(elem === null) return th.ret(eargs);

    if(elem.arg === null){
      eargs.push(elem.val);
      const e = this.elem = List.from(elem.next);
      if(e !== null) e.val = this.getIdent(e.ident);
      return;
    }

    if(this.nval) return th.call(elem.val.invoke(elem.arg));
    elem.val = this.gval;
    elem.arg = elem.arg.next;
  }
}

class InvocationWithArguments extends Invocation{
  static ptrsNum = this.keys(['args', 'eargs']);

  constructor(g, parent=null, idents=null, args=null){
    super(g, parent, idents);
    if(g.dsr) return;

    this.args = args;
    this.eargs = null;
  }

  evalArgs(){
    return new ArgumentsInvocation(this.g, this.prev, this.args);
  }

  hasLval(index){
    let {args} = this;

    while(index-- !== 0){
      if(args === null) return 0;
      args = args.next;
    }

    if(args === null || args.arg !== null) return 0;
    return 1;
  }

  getLval(index){
    let {args} = this;

    while(index-- !== 0){
      if(args === null) return null;
      args = args.next;
    }

    if(args === null || args.arg !== null) return null;
    return args.ident;
  }

  getLvals(){
    let {args} = this;
    const arr = new cgs.Array(this.g);

    while(args !== null){
      if(args.arg !== null) return null;
      arr.push(args.ident);
      args = args.next;
    }

    return arr;
  }
}

class NativeInvocation extends InvocationWithArguments{
  invoke(args){
    if(args !== null) args = args.list;
    return new this.constructor(this.g, this.parent, null, args);
  }
}

class Zero extends NativeInvocation{
  tick(th){
    if(this.eargs === null){
      if(this.nval) return th.call(this.evalArgs());
      this.eargs = this.gval;
    }

    const {args, eargs} = this;

    th.ret(eargs.get(1));
  }
}

class One extends NativeInvocation{
  tick(th){
    if(this.eargs === null){
      if(this.nval) return th.call(this.evalArgs());
      this.eargs = this.gval;
    }

    const {args, eargs} = this;

    th.ret(eargs.get(0));
  }
}

class Equality extends NativeInvocation{
  tick(th){
    if(this.eargs === null){
      if(this.nval) return th.call(this.evalArgs());
      this.eargs = this.gval;
    }

    const {args, eargs} = this;

    const bit = eargs.get(0) === eargs.get(1) & 1;
    const val = this.intp.globInv.getIdentByIndex(bit);

    th.ret(val);
  }
}

class Assign extends NativeInvocation{
  tick(th){
    if(this.eargs === null){
      if(this.nval) return th.call(this.evalArgs());
      this.eargs = this.gval;
    }

    const {args, eargs} = this;

    const ident = this.getLval(0);
    if(ident === null) return th.ret(this.intp.zero);

    const val = eargs.get(1);
    this.prev.setIdent(ident, val);

    th.ret(val);
  }
}

class Variable extends NativeInvocation{
  tick(th){
    if(this.eargs === null){
      if(this.nval) return th.call(this.evalArgs());
      this.eargs = this.gval;
    }

    const {args, eargs} = this;

    const ident = this.getLval(0);
    if(ident === null) return th.ret(this.intp.zero);

    const val = eargs.get(1);
    this.prev.createIdent(ident, val);

    th.ret(val);
  }
}

class NewFunction extends NativeInvocation{
  tick(th){
    const {args} = this;

    const formalArgs = this.getLvals();
    if(formalArgs === null) return th.ret(this.intp.zero);

    th.ret(new FunctionTemplate(this.g, this.prev, null, null, formalArgs));
  }
}

class FunctionTemplate extends NativeInvocation{
  static ptrsNum = this.keys(['formalArgs']);

  constructor(g, parent=null, idents=null, args=null, formalArgs=null){
    super(g, parent, idents, args);
    if(g.dsr) return;

    this.formalArgs = formalArgs;
  }

  invoke(args){
    return new this.constructor(this.g, this.parent, null, args, this.formalArgs);
  }

  tick(th){
    th.ret(new UserlandFunction(this.g, this.parent, null, null, this.formalArgs, this.args));
  }
}

class UserlandFunction extends NativeInvocation{
  static ptrsNum = this.keys(['formalArgs', 'elem']);

  constructor(g, parent=null, idents=null, args=null, formalArgs=null, elem=null){
    super(g, parent, idents, args);
    if(g.dsr) return;

    this.formalArgs = formalArgs;
    this.elem = elem;
  }

  invoke(args){
    let {elem} = this;
    if(elem !== null) elem = List.from(elem.list);

    if(args !== null) args = args.list;
    return new this.constructor(this.g, this.parent, null, args, this.formalArgs, elem);
  }

  tick(th){
    if(this.eargs === null){
      if(this.nval) return th.call(this.evalArgs());

      const fa = this.formalArgs;
      const es = this.eargs = this.gval;

      for(let i = 0; i !== fa.length; i++)
        this.createIdent(fa[i], es.get(i));

      if(this.elem !== null) this.elem.ident = this.getIdent(this.elem.ident);
    }

    const {elem} = this;

    if(elem === null) return th.ret(this.intp.zero);

    if(elem.arg === null){
      if(elem.next === null) return th.ret(elem.val);
      const e = this.elem = List.from(elem.next);
      if(e !== null) e.val = this.getIdent(e.ident);
      return;
    }

    const tco = elem.next === null && elem.arg.next === null & 0;
    if(this.nval) return th.call(elem.val.invoke(elem.arg), tco);
    elem.val = this.gval;
    elem.arg = elem.arg.next;
  }
}

class Read extends NativeInvocation{
  tick(th){
    if(this.eargs === null){
      if(this.nval) return th.call(this.evalArgs());
      this.eargs = this.gval;
    }

    const {args, eargs} = this;

    const bit = this.g.stdin.read(1)[0] & 1;
    const val = this.intp.globInv.getIdentByIndex(bit);

    th.ret(val);
  }
}

class Write extends NativeInvocation{
  tick(th){
    if(this.eargs === null){
      if(this.nval) return th.call(this.evalArgs());
      this.eargs = this.gval;
    }

    const {args, eargs} = this;

    const val = eargs.get(0);
    const bit = val !== this.intp.zero & 1;
    this.g.stdout.write(Buffer.from([bit]), 1);

    th.ret(val);
  }
}

class Eof extends NativeInvocation{
  tick(th){
    if(this.eargs === null){
      if(this.nval) return th.call(this.evalArgs());
      this.eargs = this.gval;
    }

    const {args, eargs} = this;

    const bit = !this.g.stdin.hasMore & 1;
    const val = this.intp.globInv.getIdentByIndex(bit);

    th.ret(val);
  }
}

const ctorsArr = [
  List,
  Argument,
  EvaluatedArguments,
  Invocation,
  GlobalInvocation,
  ArgumentsInvocation,
  InvocationWithArguments,
  NativeInvocation,
  Zero,
  One,
  Equality,
  Assign,
  Variable,
  NewFunction,
  FunctionTemplate,
  UserlandFunction,
  Read,
  Write,
  Eof,
];

const ctorsObj = O.obj();
for(const ctor of ctorsArr)
  ctorsObj[ctor.name] = ctor;

module.exports = Object.assign(Interpreter, {
  ctorsArr,
  ctorsObj,
});

const Parser = require('./parser');
const Compiler = require('./compiler');

Interpreter.Parser = Parser;
Interpreter.Compiler = Compiler;