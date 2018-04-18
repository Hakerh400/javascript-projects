'use strict';

var fs = require('fs');
var path = require('path');
var O = require('../framework');

var inputLayerSize = 1;
var outputLayerSize = 10;

var hiddenLayersNum = 1;
var neuronsPerLayer = 30;

var neuralNetFile = path.join(__dirname, '../../Python/neural-net/output.txt');

setTimeout(main);

function main(){
  var data = fs.readFileSync(neuralNetFile, 'utf8');
  data = data.split(/[\s\[\]]+/).filter(a => a).map(a => +a);

  var wss = [];
  var bss = [];

  var layers = [new Float32Array(inputLayerSize)];

  wss.push(splice(inputLayerSize, neuronsPerLayer));
  bss.push(data.splice(0, neuronsPerLayer));

  for(var i = 0; i < hiddenLayersNum; i++){
    layers.push(new Float32Array(neuronsPerLayer));

    var nextLayerSize = i !== hiddenLayersNum - 1 ? neuronsPerLayer : outputLayerSize;

    wss.push(splice(neuronsPerLayer, nextLayerSize));
    bss.push(data.splice(0, nextLayerSize));
  }

  layers.push(new Float32Array(outputLayerSize));

  /////////////////////////////////////////////////////////

  var input = [0];
  var output = calc(input);
  console.log(output.map(a => a.toFixed(2)).join`\n`);

  /////////////////////////////////////////////////////////

  function calc(input){
    input.forEach((a, i) => layers[0][i] = a);

    for(var layerIndex = 1; layerIndex < layers.length; layerIndex++){
      var ws = wss[layerIndex - 1];
      var bs = bss[layerIndex - 1];

      var layerPrev = layers[layerIndex - 1];
      var layer = layers[layerIndex];

      for(var neuronIndex = 0; neuronIndex < layer.length; neuronIndex++){
        var sum = bs[neuronIndex];

        for(var neuronPrevIndex = 0; neuronPrevIndex < layerPrev.length; neuronPrevIndex++)
          sum += layerPrev[neuronPrevIndex] * ws[neuronPrevIndex][neuronIndex];

        layer[neuronIndex] = Math.tanh(sum);
      }
    }

    return [...layers[layers.length - 1]];
  }

  function splice(h, w){
    var d = data.splice(0, w * h);
    var arr = [];

    for(var i = 0; i < h; i++)
      arr.push(d.splice(0, w));

    return arr;
  }
}