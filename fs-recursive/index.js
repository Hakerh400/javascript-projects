'use strict';

const fs = require('fs');
const path = require('path');
const O = require('../framework');

class FileQueueElem{
  constructor(fullPath, relativePath=null, depth=null, name=null, isDir=null, processed=false){
    if(isDir === null) isDir = fs.statSync(fullPath).isDirectory();
    if(name === null) name = path.parse(fullPath).base;
    if(relativePath === null) relativePath = name;
    if(depth === null) depth = (relativePath.match(/[\/\\]/g) || []).length;

    this.fullPath = fullPath;
    this.relativePath = relativePath;
    this.depth = depth;
    this.name = name;
    this.isDir = isDir;
    this.processed = processed;
  }

  static copy(elem){
    var {fullPath, relativePath, depth, name, isDir, processed} = elem;
    return new FileQueueElem(fullPath, relativePath, depth, name, isDir, processed);
  }
};

module.exports = {
  FileQueueElem,
  processFiles,
  processFilesSync,
  deleteFiles,
  deleteFilesSync,
  createDir,
  createDirSync,
};

function processFiles(filePath, func, cb=O.nop){
  processElem(false, [new FileQueueElem(formatPath(filePath))], func, cb);
}

function processFilesSync(filePath, func){
  processElem(true, [new FileQueueElem(formatPath(filePath))], func);
}

function processElem(sync, queue, func, cb=O.nop){
  while(1){
    var elem = queue.pop();

    func(FileQueueElem.copy(elem));

    if(elem.isDir && !elem.processed){
      elem.processed = true;
      queue.push(elem);

      var files = fs.readdirSync(elem.fullPath);

      files.forEach(file => {
        var fullPath = path.join(elem.fullPath, file);
        var relativePath = path.join(elem.relativePath, file);

        queue.push(new FileQueueElem(fullPath, relativePath));
      });
    }

    if(queue.length){
      if(sync) continue;
      else return setTimeout(() => processElem(false, queue, func, cb));
    }else{
      if(sync) return cb();
      else return setTimeout(() => cb());
    }
  }
}

function deleteFiles(filePath, cb=O.nop){
  processFiles(filePath, deleteFile, cb);
}

function deleteFilesSync(filePath){
  processFilesSync(filePath, deleteFile);
}

function deleteFile(obj){
  if(obj.isDir){
    if(obj.processed) fs.rmdirSync(obj.fullPath);
  }else{
    fs.unlinkSync(obj.fullPath);
  }
}

function createDir(dirPath, cb=O.nop){
  var err = null;

  try{
    createDirSync(dirPath);
  }catch(e){
    err = e;
  }

  setTimeout(() => {
    cb(err);
  });
}

function createDirSync(dirPath){
  dirPath = formatPath(dirPath);

  var dirs = dirPath.split('\\');
  dirPath = dirs.shift();

  while(dirs.length !== 0){
    dirPath = path.join(dirPath, dirs.shift());

    while(!fs.existsSync(dirPath)){
      try{
        fs.mkdirSync(dirPath);
      }catch(err){}
    }
  }
}

function formatPath(filePath){
  return filePath.replace(/\//g, '\\');
}