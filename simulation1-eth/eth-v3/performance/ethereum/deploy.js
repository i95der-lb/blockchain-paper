const Web3 = require('web3');
const mycontract = require('./build/MyContract.json');
const dotenv = require('dotenv');
const fs = require('fs-extra');
const sleep = require('util').promisify(setTimeout);
const exec =  require('util').promisify(require('child_process').exec);

dotenv.config();

let myip;
let provider;
let web3;
const getmyip = async () => {
    const { stdout } = await exec("grep `hostname` /etc/hosts | cut -d ' ' -f1 | cut -f1");
    myip = stdout.replace(/\n/g, '');
    provider = new Web3.providers.HttpProvider('http://'+ myip +':' + process.env.INITIAL_RPCPORT) || 'http://'+ myip +':' + process.env.INITIAL_RPCPORT;
    web3 = new Web3(provider);
};  



    //deploy function and call it only to use async/await syntax
    let deploy = async () => {
        let accounts = await web3.eth.getAccounts();

        console.log('Attempting to deploy from account ', accounts[0]);
        
        let keepTrying;
        let count = 0;
            do {
                try {
                    let result = await new web3.eth.Contract(JSON.parse(mycontract.interface))
                    .deploy({ data: '0x'+mycontract.bytecode })
                    .send({ gas: '1000000', from: accounts[0]});
                    keepTrying = false;
                    console.log('Contract deployed to : ',result.options.address);
                } catch {
                    keepTrying = true;
                    count = count + 1;
                }
            } while (keepTrying && count < 20)



        // const result = await new web3.eth.Contract(JSON.parse(mycontract.interface))
        // .deploy({ data: '0x'+mycontract.bytecode })
        // .send({ gas: '1000000', from: accounts[0]});

        // console.log('Contract deployed to : ',result.options.address);
    };

getmyip().then(() => {
    
    deploy();
});


