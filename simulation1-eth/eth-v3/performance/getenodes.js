var timely = require('timely');
const path = require('path');
const fs = require('fs-extra');
const Web3 = require('web3');
const { Admin } = require('web3-eth-admin');
const dotenv = require('dotenv');
const mycontract = require('./ethereum/mycontract');
var osu = require('node-os-utils');
const sleep = require('util').promisify(setTimeout);
const exec =  require('util').promisify(require('child_process').exec);

dotenv.config();

let myip;
const getmyip = async () => {
    const { stdout } = await exec("grep `hostname` /etc/hosts | cut -d ' ' -f1 | cut -f1");
    myip = stdout.replace(/\n/g, '');
};  


const nodesPath = path.join(__dirname,'..','nodes');

const getEnode = async (x) => {
    var admin = new Admin(new Web3.providers.HttpProvider('http://'+ myip +':' + x) || ('http://'+ myip +':' + x));
    console.log(('Connecting to http://'+ myip +':' + x));
    var nodeInfo =  await admin.getNodeInfo();
    var stop = await admin.stopRPC();
    return nodeInfo;
};


// var count = 0;
main = async () => {
    for(var i =1; i <= process.env.NODES ; i++) {
        var rpcport = parseFloat(process.env.INITIAL_RPCPORT)+parseFloat(i)-parseFloat(1);
        let keepTrying;
        let count = 0;
        do {
            try {
                await getEnode(rpcport).then(async (nodeInfo) => {
                    await sleep(500);
                    // console.log(rpcport);
                    var newPath = path.join(nodesPath,'node' + i,'enode.txt');
                    fs.appendFile(newPath,nodeInfo.enode, () => {
                        console.log('Saved enode node ' + i);
                    } );
                    
                });
                keepTrying = false;
            } catch {
                keepTrying = true;
                count = count + 1;
            }
        } while (keepTrying && count < 20)
    
    }
};

getmyip().then( () => {
    main();
}) ;
// getEnode(20005).then((nodeInfo) => {
//     console.log(nodeInfo.enode);
// });