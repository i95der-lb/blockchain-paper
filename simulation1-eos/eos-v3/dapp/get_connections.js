const dotenv = require('dotenv');
const { Api, JsonRpc, RpcError } = require('eosjs');
const { JsSignatureProvider } = require('eosjs/dist/eosjs-jssig');
const { TextEncoder, TextDecoder } = require('util');  
const fetch = require("node-fetch");
var timely = require('timely');
const fs = require('fs-extra');

dotenv.config();
var temp = [];

const eosio = process.env.EOSIO;
const testaccount = process.env.TESTACCOUNT;
const mycontract = process.env.MYCONTRACT;
const han = process.env.HAN;

const signatureProvider = new JsSignatureProvider([eosio,testaccount,mycontract,han]);

const rpc = (port) => {
    return new JsonRpc('http://127.0.0.1:'+ port, { fetch });
};

const getPeers = async (port) => {
    return rpc(port).fetch("/v1/net/connections",{});
};


portToIndex = (port) => {
    return parseFloat(port) - parseFloat(process.env.P2PPORT);
};

getPeers(8000).then((allpeers) => {
    var keys = Object.keys(allpeers);
    for( var j = 0; j < keys.length ; j++) {
        var port = allpeers[j].peer.split(':')[1];
        if(port > process.env.P2PPORT && port < process.env.LAST_P2PPORT) {
            console.log(port);
        }
    }

});


main = async () => {
    for(var i =0; i <= process.env.NODES ; i++) {
        var x = "node" + i;
        var rpcport = parseFloat(process.env.HTTPPORT)+parseFloat(i);
        await getPeers(rpcport).then((mypeers) => {
            var keys = Object.keys(mypeers);
            for(var j = 0; j < keys.length ; j++ ) {
                var port = mypeers[j].peer.split(':')[1];
                console.log(x,port);
                if(port >= process.env.P2PPORT && port <= process.env.LAST_P2PPORT) {
                    // console.log(port);
                    var y = x + ' -> ' + "node" + portToIndex(port) + ';';
                    temp.push(y);
                }
            }
            
        });
    
    }
};

main().then(() => {
    console.log(temp);
    fs.appendFile('network-graph', 'digraph {\n');
    fs.appendFile('network-graph', temp.join('\n'));
    fs.appendFile('network-graph', '\n}');
});