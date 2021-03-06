'use strict';

const fs = require('fs');
const path = require('path');
const O = require('../omikron');
const SG = require('../serializable-graph');
const Syntax = require('./syntax');
const langsList = require('./langs-list');
const StackFrame = require('./stack-frame');
const ParserBase = require('./parser-base');
const CompilerBase = require('./compiler-base');
const Thread = require('./thread');
const AST = require('./ast');
const cgs = require('./common-graph-nodes');

const {ParseDef, ParsePat, ParseElem} = ParserBase;
const {CompileDef, CompileArr} = CompilerBase;
const {ASTNode, ASTDef, ASTPat, ASTElem, ASTNterm, ASTTerm} = AST;

const baseGraphCtors = [
  ParseDef, ParsePat, ParseElem,
  CompileDef, CompileArr,
  Thread,
  AST, ASTDef, ASTPat, ASTNterm, ASTTerm,
].concat(cgs.ctorsArr);

const cwd = __dirname;
const langsDir = path.join(cwd, 'langs');

const cache = O.obj();

class ProgrammingLanguage{
  constructor(name, syntax, Parser, Compiler, Interpreter){
    this.name = name;
    this.syntax = syntax;

    const ctors = this.graphCtors = baseGraphCtors.concat([
      this.Parser = Parser,
      this.Compiler = Compiler,
      this.Interpreter = Interpreter,
    ]).concat(Interpreter.ctorsArr);

    const refs = this.graphRefs = [this, syntax];
    const {defs} = syntax;

    for(const defName in defs){
      const def = defs[defName]['*'];
      refs.push(def);

      for(const pat of def.sects.include.pats){
        refs.push(pat);

        for(const elem of pat.elems){
          refs.push(elem);
          if(elem.sep !== null) refs.push(elem.sep);
        }
      }
    }
  }

  static async get(langName){
    if(!O.has(langsList, langName))
      throw new TypeError(`Unknown programming language ${O.sf(langName)}`);

    const lang = langsList[langName];
    if(O.has(cache, lang))
      return cache[lang];

    const dir = path.join(langsDir, lang);
    const syntax = Syntax.fromStr(await O.readFile(path.join(dir, 'syntax/script.txt')));
    const Parser = require(path.join(dir, 'parser'));
    const Compiler = require(path.join(dir, 'compiler'));
    const Interpreter = require(path.join(dir, 'interpreter'));

    const langInstance = new PL(langName, syntax, Parser, Compiler, Interpreter);
    cache[lang] = langInstance;

    return langInstance;
  }
}

const PL = ProgrammingLanguage;

module.exports = PL;