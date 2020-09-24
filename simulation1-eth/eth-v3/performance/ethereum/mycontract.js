const Web3 = require('web3');
const path = require('path');
const fs = require('fs-extra');
const dotenv = require('dotenv');
const compiledContract = require('./build/MyContract.json');
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
    const mycontract =  new web3.eth.Contract(JSON.parse(compiledContract.interface),process.env.MYCONTRACT_ADDRESS);
    module.exports = mycontract;
}; 

getmyip();

