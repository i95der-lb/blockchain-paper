const dotenv = require('dotenv');
const { Api, JsonRpc, RpcError } = require('eosjs');
const { JsSignatureProvider } = require('eosjs/dist/eosjs-jssig');
const { TextEncoder, TextDecoder } = require('util');  
const fetch = require("node-fetch");
var timely = require('timely');
const fs = require('fs');
var osu = require('node-os-utils');
const sleep = require('util').promisify(setTimeout);
const exec =  require('util').promisify(require('child_process').exec);


dotenv.config();
process.argv.shift()  // skip node.exe
process.argv.shift()  // skip name of js file
var dapp_accounts_obj = JSON.parse(process.argv[0]);
let myip;

const eosio = process.env.EOSIO;
const testaccount = process.env.TESTACCOUNT;
const mycontract = process.env.MYCONTRACT;
const han = process.env.HAN;
const dappport = process.env.DAPPPORT;

let samples;
let dapp_acc_keys;
let dapp_acc_values;
let signatureProvider = new JsSignatureProvider([eosio,testaccount,mycontract,han]);
let rpc;
let api;
const getmyip = async () => {
  const { stdout } = await exec("grep `hostname` /etc/hosts | cut -d ' ' -f1 | cut -f1");
  myip = stdout.replace(/\n/g, '');
  rpc = new JsonRpc('http://'+ myip + ':' + dappport, { fetch });
  api = new Api({ rpc, signatureProvider, textDecoder: new TextDecoder(), textEncoder: new TextEncoder() });

};  



const valueToDeposit = "2.0002 SYS";
const valueToWithdraw = "10000";
const dataToStore = ['Iman Rabie Dernayka','AUB Student EECE Department GR'];
const dataToStore2 = ['Iman Rabie Dernayka Iman Rabie Dernayka','AUB Student EECE Department GR AUB Student EECE Department GR'];


const tokenTransfer = async (v,s) => {
  return await api.transact({
      actions: [{
        account: 'eosio.token',
        name: 'transfer',
        authorization: [{
          actor: 'han',
          permission: 'active',
        }],
        data: {
          from: "han",
          to: "mycontract",
          quantity: v,
          memo: "mycontract!" 
        },
      }]
    }, {
      blocksBehind: 3,
      expireSeconds: parseFloat(parseFloat(150)+parseFloat(s))
    });
}


const multiDeposit = async (v,numberOfIterations) => {
    let array = [];
    for(var j= 0; j < numberOfIterations ; j++) {
        if(numberOfIterations == 10) {
          array.push(tokenTransfer(v,3+j));
        }
        else if (numberOfIterations == 50) {
          array.push(tokenTransfer(v,13+j));
        }
        else if (numberOfIterations == 100) {
          array.push(tokenTransfer(v,63+j));

        }else if ( numberOfIterations == 150 ) {
          array.push(tokenTransfer(v,163+j));
        }
        
        // console.log(j);
    }
    return await Promise.all(array);
}; 

const withdraw = async (v,s) => {
  return await api.transact({
      actions: [{
        account: 'mycontract',
        name: 'withdraw',
        authorization: [{
          actor: 'han',
          permission: 'active',
        }],
        data: {
          user: "han",
          q: v
        },
      }]
    }, {
      blocksBehind: 3,
      expireSeconds: parseFloat(parseFloat(150)+parseFloat(s))
    });
}

const multiWithdraw = async (v,numberOfIterations) => {
    let array = [];
    for(var j= 0; j < numberOfIterations ; j++) {
      if(numberOfIterations == 10) {
        array.push(withdraw(v,3+j));
      }
      else if (numberOfIterations == 50) {
        array.push(withdraw(v,13+j));
      }
      else if (numberOfIterations == 100) {
        array.push(withdraw(v,63+j));

      }else if ( numberOfIterations == 150 ) {
        array.push(withdraw(v,163+j));
      }
    }
    return await Promise.all(array);
}; 

const readBalance = async (v) => {
  return await rpc.get_table_rows({
    json: true,                 // Get the response as json
    code: 'mycontract',           // Contract that we target
    scope: v,          // Account that owns the data
    table: 'balance',          // Table name
    lower_bound: 'SYS',     // Table primary key value
    limit: 1,                   // Here we limit to 1 to get only the single row with primary key equal to 'testacc'
    reverse: false,             // Optional: Get reversed data
    show_payer: false         // Optional: Show ram payer
  })
}


const multiReadBalance = async (v,numberOfIterations) => {
    let array = [];
    for(var j= 0; j < numberOfIterations ; j++) {
        array.push(readBalance(v));
    }
    return await Promise.all(array);
}; 

const storeInContract = async (a,b,c,s) => {
  return await api.transact({
      actions: [{
        account: 'mycontract',
        name: 'storein',
        authorization: [{
          actor: a,
          permission: 'active',
        }],
        data: {
          user: a,
          fullname: b,
          description: c
        },
      }]
    }, {
      blocksBehind: 3,
      expireSeconds: parseFloat(parseFloat(150)+parseFloat(s))
    });
}

const multiStoreInContract = async (list,numberOfIterations) => {
    let array = [];
    var c = 0;
    for(var j= 0; j < numberOfIterations ; j++) {
      if(numberOfIterations == 10) {
        array.push(storeInContract(list[j],dataToStore2[0],dataToStore2[1],3+j));
      }
      else if (numberOfIterations == 50) {
        array.push(storeInContract(list[j],dataToStore2[0],dataToStore2[1],13+j));
      }
      else if (numberOfIterations == 100) {
        array.push(storeInContract(list[j],dataToStore2[0],dataToStore2[1],63+j));

      }else if ( numberOfIterations == 150 ) {
        array.push(storeInContract(list[j],dataToStore2[0],dataToStore2[1],163+j));
      }
    }
    return await Promise.all(array);
}; 

const readTableRow = async (v) => {
  return await rpc.get_table_rows({
    json: true,                 // Get the response as json
    code: 'mycontract',           // Contract that we target
    scope: 'mycontract',          // Account that owns the data
    table: 'mystorage',          // Table name
    lower_bound: v,
    limit: 1,                  // Here we limit to 1 to get only the single row with primary key equal to 'testacc'
    reverse: false,             // Optional: Get reversed data
    show_payer: false         // Optional: Show ram payer
  })
}

const multiReadTableRow = async (numberOfIterations) => {
    let array = [];
    for(var j= 0; j < numberOfIterations ; j++) {
        array.push(readTableRow(dapp_acc_keys[j]));
    }
    return await Promise.all(array);
}; 
const getMetrics = async () => {
  let array = [];
  var cpu = osu.cpu;
  var mem = osu.mem;
  array.push(cpu.usage(),mem.info());
  return await Promise.all(array);
}

DepositT = timely.promise(tokenTransfer);
withdrawT = timely.promise(withdraw);
readBalanceT = timely.promise(readBalance);
storeInContractT = timely.promise(storeInContract);
readTableRowT = timely.promise(readTableRow);

multiDepositT = timely.promise(multiDeposit);
multiWithdrawT = timely.promise(multiWithdraw);
multiReadBalanceT = timely.promise(multiReadBalance);
multiStoreInContractT = timely.promise(multiStoreInContract);
multiReadTableRowT = timely.promise(multiReadTableRow);

let main = async () => {
  let keepTrying;
  let count = 0;
        do {
            try {
                await getmyip();
                await sleep(500);
                keepTrying = false;
            } catch {
                keepTrying = true;
                count = count + 1;
            }
        } while (keepTrying && count < 20)
    await getmyip();
  console.log('Starting Dapp');

  await getMetrics().then((res) => {
    fs.appendFile('metrics.json','{\"StartDApp\":[' + JSON.stringify(res[0]) +','+JSON.stringify(res[1].usedMemMb)+ '],', () => {
      console.log(JSON.stringify(res[0]),JSON.stringify(res[1].usedMemMb));
    });
  });

  await DepositT(valueToDeposit,1).then(() => {
    fs.appendFile('output.txt', 'Deposit:   ' + DepositT.time + '\n', () => {
    console.log('Deposit:   ' + DepositT.time);
    
    });
  });

  await getMetrics().then((res) => {
    fs.appendFile('metrics.json','\"Deposit\":[' + JSON.stringify(res[0]) +','+JSON.stringify(res[1].usedMemMb)+ '],', () => {
      console.log(JSON.stringify(res));
    });
  });

  await readBalanceT("han").then((res1) => {
    console.log(JSON.stringify(res1.rows[0].funds));
  });

  await withdrawT(valueToWithdraw,1).then((res2) => {
    fs.appendFile('output.txt', 'Withdraw:    ' + withdrawT.time + '\n', () => {
      console.log(res2.processed.action_traces['0'].console);
      console.log('Withdraw:    ' + withdrawT.time);
    });
  });

  await getMetrics().then((res) => {
    fs.appendFile('metrics.json','\"Withdraw\":[' + JSON.stringify(res[0]) +','+JSON.stringify(res[1].usedMemMb)+ '],', () => {
      console.log(JSON.stringify(res));
    });
  });

  await readBalanceT("han").then((res3) => {
    fs.appendFile('output.txt', 'ReadBalance:   ' + readBalanceT.time +'\n',()=>{
      console.log(JSON.stringify(res3.rows[0].funds));
      console.log('ReadBalance:   ' + readBalanceT.time);
    });
  });

  await getMetrics().then((res) => {
    fs.appendFile('metrics.json','\"ReadBalance\":[' + JSON.stringify(res[0]) +','+JSON.stringify(res[1].usedMemMb)+ '],', () => {
      console.log(JSON.stringify(res));
    });
  });

  await storeInContractT('testaccount',dataToStore2[0],dataToStore2[1],1).then((res4) => {
    fs.appendFile('output.txt', 'StoreInContract:   ' + storeInContractT.time + '\n', () => {
      console.log('StoreInContract:   ' + storeInContractT.time);
    });
  });

  await getMetrics().then((res) => {
    fs.appendFile('metrics.json','\"StoreInContract\":[' + JSON.stringify(res[0]) +','+JSON.stringify(res[1].usedMemMb)+ '],', () => {
      console.log(JSON.stringify(res));
    });
  });

  await readTableRowT('testaccount').then((res5) => {
    fs.appendFile('output.txt', 'ReadFromContract:    ' + readTableRowT.time+'\n', () => {
      console.log(JSON.stringify(res5.rows[0]));
      console.log('ReadFromContract:    ' + readTableRowT.time);
    });
  });

  await getMetrics().then((res) => {
    fs.appendFile('metrics.json','\"ReadFromContract\":[' + JSON.stringify(res[0]) +','+JSON.stringify(res[1].usedMemMb)+ '],', () => {
      console.log(JSON.stringify(res));
    });
  });


  //start of multi 10
  samples = 10;
  dapp_acc_keys = [];
  dapp_acc_values = [];
  for(var j= 0; j < samples ; j++) {
    dapp_acc_keys.push(Object.keys(dapp_accounts_obj.accounts[j])[0]);
    dapp_acc_values.push(Object.values(dapp_accounts_obj.accounts[j])[0]);
  }
  signatureProvider = new JsSignatureProvider([eosio,mycontract,han].concat(dapp_acc_values));
  api = new Api({ rpc, signatureProvider, textDecoder: new TextDecoder(), textEncoder: new TextEncoder() });


  await multiDepositT(valueToDeposit,samples).then(() => {
    fs.appendFile('output.txt', 'Deposit10:   ' + multiDepositT.time + '\n', () => {
        console.log('Deposit10:   ' + multiDepositT.time);
        });
  });

  await getMetrics().then((res) => {
    fs.appendFile('metrics.json','\"Deposit10\":[' + JSON.stringify(res[0]) +','+JSON.stringify(res[1].usedMemMb)+ '],', () => {
      console.log(JSON.stringify(res));
    });
  });

  await readBalanceT("han").then((res1) => {
    console.log(res1.rows[0].funds); 
  });

  await multiWithdrawT(valueToWithdraw,samples).then((res2) => {
      fs.appendFile('output.txt', 'Withdraw10:    ' + multiWithdrawT.time + '\n', () => {
        // console.log(res2[9].processed.action_traces['0'].console);
        console.log('Withdraw10:    ' + multiWithdrawT.time);
      });
  });

  await getMetrics().then((res) => {
    fs.appendFile('metrics.json','\"Withdraw10\":[' + JSON.stringify(res[0]) +','+JSON.stringify(res[1].usedMemMb)+ '],', () => {
      console.log(JSON.stringify(res));
    });
  });
  
  await multiReadBalanceT("han",samples).then((res3) => {
        fs.appendFile('output.txt', 'ReadBalance10:   ' + multiReadBalanceT.time +'\n',()=>{
          console.log(res3[9].rows[0].funds);
          console.log('ReadBalance10:   ' + multiReadBalanceT.time);
        });
  });

  await getMetrics().then((res) => {
    fs.appendFile('metrics.json','\"ReadBalance10\":[' + JSON.stringify(res[0]) +','+JSON.stringify(res[1].usedMemMb)+ '],', () => {
      console.log(JSON.stringify(res));
    });
  });

  await multiStoreInContractT(dapp_acc_keys,samples).then((res4) => {
          fs.appendFile('output.txt', 'StoreInContract10:   ' + multiStoreInContractT.time + '\n', () => {
            console.log('StoreInContract10:   ' + multiStoreInContractT.time);
          });
  });

  await getMetrics().then((res) => {
    fs.appendFile('metrics.json','\"StoreInContract10\":[' + JSON.stringify(res[0]) +','+JSON.stringify(res[1].usedMemMb)+ '],', () => {
      console.log(JSON.stringify(res));
    });
  });

  await multiReadTableRowT(samples).then((res5) => {
    fs.appendFile('output.txt', 'ReadFromContract10:    ' + multiReadTableRowT.time+'\n', () => {
      console.log(res5[9].rows[0]);
      console.log('ReadFromContract10:    ' + multiReadTableRowT.time);
    });
  });

  await getMetrics().then((res) => {
    fs.appendFile('metrics.json','\"ReadFromContract10\":[' + JSON.stringify(res[0]) +','+JSON.stringify(res[1].usedMemMb)+ '],', () => {
      console.log(JSON.stringify(res));
    });
  });

  //start of multi 50
  samples = 50;
  dapp_acc_keys = [];
  dapp_acc_values = [];
  for(var j= 0; j < samples ; j++) {
    dapp_acc_keys.push(Object.keys(dapp_accounts_obj.accounts[10+j])[0]);
    dapp_acc_values.push(Object.values(dapp_accounts_obj.accounts[10+j])[0]);
  }

  signatureProvider = new JsSignatureProvider([eosio,mycontract,han].concat(dapp_acc_values));
  api = new Api({ rpc, signatureProvider, textDecoder: new TextDecoder(), textEncoder: new TextEncoder() });


  await multiDepositT(valueToDeposit,samples).then(() => {
    fs.appendFile('output.txt', 'Deposit50:   ' + multiDepositT.time + '\n', () => {
        console.log('Deposit50:   ' + multiDepositT.time);
        });
  });
  
  await getMetrics().then((res) => {
    fs.appendFile('metrics.json','\"Deposit50\":[' + JSON.stringify(res[0]) +','+JSON.stringify(res[1].usedMemMb)+ '],', () => {
      console.log(JSON.stringify(res));
    });
  });

  await readBalanceT("han").then((res1) => {
        console.log(res1.rows[0].funds); 
  });
        
  await multiWithdrawT(valueToWithdraw,samples).then((res2) => {
          fs.appendFile('output.txt', 'Withdraw50:    ' + multiWithdrawT.time + '\n', () => {
            // console.log(res2[9].processed.action_traces['0'].console);
            console.log('Withdraw50:    ' + multiWithdrawT.time);
          });
  });

  await getMetrics().then((res) => {
    fs.appendFile('metrics.json','\"Withdraw50\":[' + JSON.stringify(res[0]) +','+JSON.stringify(res[1].usedMemMb)+ '],', () => {
      console.log(JSON.stringify(res));
    });
  });
          
  await multiReadBalanceT("han",samples).then((res3) => {
            fs.appendFile('output.txt', 'ReadBalance50:   ' + multiReadBalanceT.time +'\n',()=>{
              console.log(res3[9].rows[0].funds);
              console.log('ReadBalance50:   ' + multiReadBalanceT.time);
            });
  });

  await getMetrics().then((res) => {
    fs.appendFile('metrics.json','\"ReadBalance50\":[' + JSON.stringify(res[0]) +','+JSON.stringify(res[1].usedMemMb)+ '],', () => {
      console.log(JSON.stringify(res));
    });
  });
            
  await multiStoreInContractT(dapp_acc_keys,samples).then((res4) => {
              fs.appendFile('output.txt', 'StoreInContract50:   ' + multiStoreInContractT.time + '\n', () => {
                console.log('StoreInContract50:   ' + multiStoreInContractT.time);
              }); 
  });

  await getMetrics().then((res) => {
    fs.appendFile('metrics.json','\"StoreInContract50\":[' + JSON.stringify(res[0]) +','+JSON.stringify(res[1].usedMemMb)+ '],', () => {
      console.log(JSON.stringify(res));
    });
  });
              
  await multiReadTableRowT(samples).then((res5) => {
                fs.appendFile('output.txt', 'ReadFromContract50:    ' + multiReadTableRowT.time+'\n', () => {
                  console.log(res5[49].rows[0]);
                  console.log('ReadFromContract50:    ' + multiReadTableRowT.time);
                });
  });

  await getMetrics().then((res) => {
    fs.appendFile('metrics.json','\"ReadFromContract50\":[' + JSON.stringify(res[0]) +','+JSON.stringify(res[1].usedMemMb)+ '],', () => {
      console.log(JSON.stringify(res));
    });
  });


  //start of multi 100
  samples = 100;
  dapp_acc_keys = [];
  dapp_acc_values = [];
  for(var j= 0; j < samples ; j++) {
    dapp_acc_keys.push(Object.keys(dapp_accounts_obj.accounts[60+j])[0]);
    dapp_acc_values.push(Object.values(dapp_accounts_obj.accounts[60+j])[0]);
  }
  signatureProvider = new JsSignatureProvider([eosio,mycontract,han].concat(dapp_acc_values));
  api = new Api({ rpc, signatureProvider, textDecoder: new TextDecoder(), textEncoder: new TextEncoder() });

  await multiDepositT(valueToDeposit,samples).then(() => {
    fs.appendFile('output.txt', 'Deposit100:   ' + multiDepositT.time + '\n', () => {
        console.log('Deposit100:   ' + multiDepositT.time);
        });
  });

  await getMetrics().then((res) => {
    fs.appendFile('metrics.json','\"Deposit100\":[' + JSON.stringify(res[0]) +','+JSON.stringify(res[1].usedMemMb)+ '],', () => {
      console.log(JSON.stringify(res));
    });
  });

  await readBalanceT("han").then((res1) => {
        console.log(res1.rows[0].funds); 
  });
        
  await multiWithdrawT(valueToWithdraw,samples).then((res2) => {
          fs.appendFile('output.txt', 'Withdraw100:    ' + multiWithdrawT.time + '\n', () => {
            // console.log(res2[9].processed.action_traces['0'].console);
            console.log('Withdraw100:    ' + multiWithdrawT.time);
          });
  });

  await getMetrics().then((res) => {
      fs.appendFile('metrics.json','\"Withdraw100\":[' + JSON.stringify(res[0]) +','+JSON.stringify(res[1].usedMemMb)+ '],', () => {
                console.log(JSON.stringify(res));
      });
  });
          
  await multiReadBalanceT("han",samples).then((res3) => {
            fs.appendFile('output.txt', 'ReadBalance100:   ' + multiReadBalanceT.time +'\n',()=>{
              console.log(res3[9].rows[0].funds);
              console.log('ReadBalance100:   ' + multiReadBalanceT.time);
            });
  });

  await getMetrics().then((res) => {
    fs.appendFile('metrics.json','\"ReadBalance100\":[' + JSON.stringify(res[0]) +','+JSON.stringify(res[1].usedMemMb)+ '],', () => {
      console.log(JSON.stringify(res));
    });
  });
  
  await multiStoreInContractT(dapp_acc_keys,samples).then((res4) => {
      fs.appendFile('output.txt', 'StoreInContract100:   ' + multiStoreInContractT.time + '\n', () => {
          console.log('StoreInContract100:   ' + multiStoreInContractT.time);
      });
  });

  await getMetrics().then((res) => {
    fs.appendFile('metrics.json','\"StoreInContract100\":[' + JSON.stringify(res[0]) +','+JSON.stringify(res[1].usedMemMb)+ '],', () => {
      console.log(JSON.stringify(res));
    });
  });

  await multiReadTableRowT(samples).then((res5) => {
                fs.appendFile('output.txt', 'ReadFromContract100:    ' + multiReadTableRowT.time+'\n', () => {
                  console.log(res5[99].rows[0]);
                  console.log('ReadFromContract100:    ' + multiReadTableRowT.time);
                });
  });

  await getMetrics().then((res) => {
    fs.appendFile('metrics.json','\"ReadFromContract100\":[' + JSON.stringify(res[0]) +','+JSON.stringify(res[1].usedMemMb)+ '],', () => {
      console.log(JSON.stringify(res));
    });
  });

  //start of multi 150
  samples = 150;
  dapp_acc_keys = [];
  dapp_acc_values = [];
  for(var j= 0; j < samples ; j++) {
    dapp_acc_keys.push(Object.keys(dapp_accounts_obj.accounts[160+j])[0]);
    dapp_acc_values.push(Object.values(dapp_accounts_obj.accounts[160+j])[0]);
  }
  signatureProvider = new JsSignatureProvider([eosio,mycontract,han].concat(dapp_acc_values));
  api = new Api({ rpc, signatureProvider, textDecoder: new TextDecoder(), textEncoder: new TextEncoder() });

  await multiDepositT(valueToDeposit,samples).then(() => {
    fs.appendFile('output.txt', 'Deposit150:   ' + multiDepositT.time + '\n', () => {
        console.log('Deposit150:   ' + multiDepositT.time);
        });
  });

  await getMetrics().then((res) => {
    fs.appendFile('metrics.json','\"Deposit150\":[' + JSON.stringify(res[0]) +','+JSON.stringify(res[1].usedMemMb)+ '],', () => {
      console.log(JSON.stringify(res));
    });
  });

  await readBalanceT("han").then((res1) => {
        console.log(res1.rows[0].funds); 
  });
        
  await multiWithdrawT(valueToWithdraw,samples).then((res2) => {
          fs.appendFile('output.txt', 'Withdraw150:    ' + multiWithdrawT.time + '\n', () => {
            // console.log(res2[9].processed.action_traces['0'].console);
            console.log('Withdraw150:    ' + multiWithdrawT.time);
          });
  });

  await getMetrics().then((res) => {
      fs.appendFile('metrics.json','\"Withdraw150\":[' + JSON.stringify(res[0]) +','+JSON.stringify(res[1].usedMemMb)+ '],', () => {
                console.log(JSON.stringify(res));
      });
  });
          
  await multiReadBalanceT("han",samples).then((res3) => {
            fs.appendFile('output.txt', 'ReadBalance150:   ' + multiReadBalanceT.time +'\n',()=>{
              console.log(res3[9].rows[0].funds);
              console.log('ReadBalance150:   ' + multiReadBalanceT.time);
            });
  });

  await getMetrics().then((res) => {
    fs.appendFile('metrics.json','\"ReadBalance150\":[' + JSON.stringify(res[0]) +','+JSON.stringify(res[1].usedMemMb)+ '],', () => {
      console.log(JSON.stringify(res));
    });
  });
  
  await multiStoreInContractT(dapp_acc_keys,samples).then((res4) => {
      fs.appendFile('output.txt', 'StoreInContract150:   ' + multiStoreInContractT.time + '\n', () => {
          console.log('StoreInContract150:   ' + multiStoreInContractT.time);
      });
  });

  await getMetrics().then((res) => {
    fs.appendFile('metrics.json','\"StoreInContract150\":[' + JSON.stringify(res[0]) +','+JSON.stringify(res[1].usedMemMb)+ '],', () => {
      console.log(JSON.stringify(res));
    });
  });

  await multiReadTableRowT(samples).then((res5) => {
                fs.appendFile('output.txt', 'ReadFromContract150:    ' + multiReadTableRowT.time+'\n', () => {
                  console.log(res5[99].rows[0]);
                  console.log('ReadFromContract150:    ' + multiReadTableRowT.time);
                });
  });

  await getMetrics().then((res) => {
    fs.appendFile('metrics.json','\"ReadFromContract150\":[' + JSON.stringify(res[0]) +','+JSON.stringify(res[1].usedMemMb)+ ']}', () => {
      console.log(JSON.stringify(res));
    });
  });

  console.log('End of Dapp.');

};


main();
