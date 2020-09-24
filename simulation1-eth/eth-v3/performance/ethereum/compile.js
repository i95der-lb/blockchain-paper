const path = require('path');
const solc = require('solc'); 
const fs = require('fs-extra');

const buildPath = path.resolve(__dirname,'build');
fs.removeSync(buildPath);

const contractPath = path.resolve(__dirname,'contracts','mycontract.sol');
const source = fs.readFileSync(contractPath,'utf-8');

const output = solc.compile(source,1).contracts;

//checks first if it exists
fs.ensureDirSync(buildPath);

for(let contract in output) {
    fs.outputJSONSync(
        path.resolve(buildPath,contract.replace(':','') + '.json'),
        output[contract]
    );
}