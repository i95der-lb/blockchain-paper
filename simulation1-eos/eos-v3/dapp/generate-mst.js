var jsgraphs = require('js-graph-algorithms');
const dotenv = require('dotenv');
const fs = require('fs-extra');
dotenv.config();
var createRandomTree = require("random-tree");
var min = 1
var max = 20
var g; 
var mytree;
var kruskal;
var degrees; 
var mst;

var createMST = async (num) => {
    g = await new jsgraphs.WeightedGraph(num);
    mytree= await createRandomTree(num);
    for (var i = 0; i < mytree.length; i++ ) {
        g.addEdge(new jsgraphs.Edge(mytree[i][0], mytree[i][1], Math.floor(Math.random() * (max - min + 1) + min)));
    }
    kruskal = await new jsgraphs.KruskalMST(g); 
    mst = await kruskal.mst;
    degrees = new Object();
    for(var i=0; i < mst.length; ++i) {
        var e = mst[i];
        var v = e.either();
        var w = e.other(v);
        // console.log('(' + v + ', ' + w + '): ' + e.weight);
        if (degrees.hasOwnProperty(v)) {
            degrees[v]++;
        }
        else degrees[v]=1;
        if (degrees.hasOwnProperty(w)) {
            degrees[w]++;
        }
        else degrees[w]=1;
    }
    for (var prop in degrees) {
        // console.log(prop + " has " + degrees[prop] + " edges");
        if (degrees[prop] > process.env.MAXPEERS) { return "FAIL";}
    } 
    return "SUCCESS";
};

let promise = async (num) => {
        var res = await createMST(num);
        var count=1;
        while(res == "FAIL") {
            res = await createMST(num);
            count++;
            console.log(count);
        }
  };
 
var count = 0;
promise(process.env.NODES).then(() => {
    
    fs.appendFile('network-graph', 'graph {\n', () => {
        for(var i=0; i < mst.length; i++) {
            var e = mst[i];
            var v = e.either();
            var w = e.other(v);
            count++;
            fs.appendFile('network-graph', parseFloat(parseFloat(v)+9000) + ' -- ' + parseFloat(parseFloat(w)+9000) + ';\n');
            
        }
        
        
        console.log(count + " Edges.");
         
        
    });
    
    
    
});




