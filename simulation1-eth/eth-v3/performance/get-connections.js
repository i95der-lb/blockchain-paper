const fs = require('fs-extra');
const Web3 = require('web3');
const { Admin } = require('web3-eth-admin');
const dotenv = require('dotenv');
const sleep = require('util').promisify(setTimeout);
const exec =  require('util').promisify(require('child_process').exec);

dotenv.config();

let myip;
const getmyip = async () => {
    const { stdout } = await exec("grep `hostname` /etc/hosts | cut -d ' ' -f1 | cut -f1");
    myip = stdout.replace(/\n/g, '');
};  

var temp = [];
process.argv.shift()  // skip node.exe
process.argv.shift()  // skip name of js file

var miners = process.argv.join(" ");

getPeers = async (x) => {
    var admin = new Admin(new Web3.providers.HttpProvider('http://'+ myip +':' + x) || ('http://'+ myip +':' + x));
    console.log(('Getting Peers from http://'+ myip +':' + x));
    var peers = await admin.getPeers();
    var stop = await admin.stopRPC();
    return peers;
};

portToIndex = (port) => {
    return parseFloat(port) - parseFloat(process.env.INITIAL_PORT) + parseFloat(1);
};

var count = 0;
main = async () => {
    for(var i =process.env.NODES; i >= 1 ; i--) {
        var x = "node" + i;
        var rpcport = parseFloat(process.env.INITIAL_RPCPORT)+parseFloat(i)-parseFloat(1);
        var myport = parseFloat(process.env.INITIAL_PORT)+parseFloat(i)-parseFloat(1);
        let keepTrying;
        let count = 0;
        let mycount = 0;
        do {
            try {
                await getPeers(rpcport).then(async (mypeers) => {
                    await sleep(500);
                    var keys = Object.keys(mypeers);
                    for(var j = 0; j < keys.length ; j++ ) {
                        // console.log(mypeers[j]);
                        var port = mypeers[j].enode.split(':')[2].split('?')[0];
                        console.log(x,port);
                        if(port >= process.env.INITIAL_PORT && port <= process.env.LAST_PORT) {
                            console.log(port);
                            var y = myport + ' -- ' + port + ';';
                            count++;
                            temp.push(y);
                        }
                    }
                    
                });
                keepTrying = false;
            } catch {
                keepTrying = true;
                mycount = mycount + 1;
            }
        } while (keepTrying && mycount < 20)
        
    
    }
};

getmyip().then( () => {
    main().then(() => {
        console.log(temp);
        fs.appendFile('network-graph-2', 'graph {\n', () => {
            fs.appendFile('network-graph-2',miners, () => {
                fs.appendFile('network-graph-2', temp.join('\n'), () => {
                    fs.appendFile('network-graph-2', '\n}', () => {
                        console.log("Number of edges ", count);
                    });
                });
            });
        });
        
    });
}) ;

// main().then(() => {
//     console.log(temp);
//     fs.appendFile('network-graph-2', 'graph {\n', () => {
//         fs.appendFile('network-graph-2',miners, () => {
//             fs.appendFile('network-graph-2', temp.join('\n'), () => {
//                 fs.appendFile('network-graph-2', '\n}', () => {
//                     console.log("Number of edges ", count);
//                 });
//             });
//         });
//     });
    
// });