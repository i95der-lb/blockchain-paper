var timely = require('timely');
const path = require('path');
const fs = require('fs-extra');
const Web3 = require('web3');
const dotenv = require('dotenv');
const compiledContract = require('./ethereum/build/MyContract.json');
// const mycontract = require('./ethereum/mycontract');
var osu = require('node-os-utils');
const sleep = require('util').promisify(setTimeout);
const exec =  require('util').promisify(require('child_process').exec);

dotenv.config();

let myip;
let provider;
let web3;
let mycontract;
const getmyip = async () => {
    let { stdout } = await exec("grep `hostname` /etc/hosts | cut -d ' ' -f1 | cut -f1");
    myip = stdout.replace(/\n/g, '');
    provider = new Web3.providers.HttpProvider('http://'+ myip +':' + process.env.MYRPCPORT) || ('http://'+ myip +':' + process.env.MYRPCPORT);
    console.log('Connecting to http://'+ myip +':' + process.env.MYRPCPORT);
    web3 = new Web3(provider);
    mycontract =  new web3.eth.Contract(JSON.parse(compiledContract.interface),process.env.MYCONTRACT_ADDRESS);
}; 


let myAccount;
let valueToDeposit = 2;
let valueToWithdraw = 1;
let data1 = "Iman Rabie Dernayka"
let data2 = "AUB Student EECE Department GR"
let data3 = "Iman Rabie Dernayka Iman Rabie Dernayka"
let data4 = "AUB Student EECE Department GR AUB Student EECE Department GR"

    
let accounts = async () => {
    return await web3.eth.getAccounts();
};

let depositInContract = async (acc,v) => {
    return await mycontract.methods.depositInContract().send({
        from: acc,
        gas: '1000000',
        value: web3.utils.toWei(v.toString(),'ether')
    });
};

let withdrawFromContract = async (acc,v) => {
    return await mycontract.methods.withdrawFromContract(web3.utils.toWei(v.toString(),'ether')).send({
    from: acc,
    gas: '1000000'
    });
};

let storeInContract = async (acc,n,d) => {
    return await mycontract.methods.storeInContract(acc,n,d).send({
        from: myAccount,
        gas: '1000000'
    });
};

let readFromContract = async (y) => {
    return await mycontract.methods.readFromContract(y).call({from: y, gas:'10000000000'});
};

let mybalance = async () => {
    return await mycontract.methods.mybalance().call();
};

let readBalanceDepositedInContract = async (y) => {
    return await mycontract.methods.readBalanceDepositedInContract(y).call({from: y, gas:'10000000000'});
};

let getMetrics = async () => {
    let array = [];
    var cpu = osu.cpu;
    var mem = osu.mem;
    array.push(cpu.usage(),mem.info());
    return await Promise.all(array);
}

let multiDeposit = async (acc,numberOfIterations, data) => {
    let array = [];
    for(var j= 0; j < numberOfIterations ; j++) {
        array.push(depositInContract(acc,data));
    }
    return await Promise.all(array);
}; 

let multiWithdraw = async (acc,numberOfIterations, value) => {
    let array = [];
    for(var j= 0; j < numberOfIterations ; j++) {
        array.push(withdrawFromContract(acc,value));
    }
    return await Promise.all(array);
}; 

let multiStore = async (accs,numberOfIterations, data1, data2) => {
    let array = [];
    for(var j= 1; j <= numberOfIterations ; j++) {
        if(numberOfIterations == 10) {
            array.push(storeInContract(accs[j],data1, data2));
        }
        if(numberOfIterations == 50) {
            array.push(storeInContract(accs[10+j],data1, data2));
        }
        if(numberOfIterations == 100) {
            array.push(storeInContract(accs[60+j],data1, data2));
        }
        if(numberOfIterations == 150) {
            array.push(storeInContract(accs[160+j],data1, data2));
        }
    }
    return await Promise.all(array);
}; 

let multiRead = async (numberOfIterations, data) => {
    let array = [];
    for(var j= 0; j < numberOfIterations; j++) {
        array.push(readFromContract(data[j]));
    }
    return await Promise.all(array);
}; 

let multiBalance = async (x, numberOfIterations) => {
    let array = [];
    for(var j= 0; j < numberOfIterations; j++) {
        array.push(readBalanceDepositedInContract(x));
    }
    return await Promise.all(array);
}; 

let multiMyBalance = async (numberOfIterations) => {
    let array = [];
    for(var j= 0; j < numberOfIterations; j++) {
        array.push(mybalance());
    }
    return await Promise.all(array);
}; 


accountsT = timely.promise(accounts);
depositInContractT = timely.promise(depositInContract);
storeInContractT = timely.promise(storeInContract);
readFromContractT = timely.promise(readFromContract);
withdrawFromContractT = timely.promise(withdrawFromContract);
mybalanceT = timely.promise(mybalance);
readBalanceDepositedInContractT = timely.promise(readBalanceDepositedInContract);
mybalanceT = timely.promise(mybalance);
multiDepositT = timely.promise(multiDeposit);
multiStoreT = timely.promise(multiStore);
multiWithdrawT = timely.promise(multiWithdraw);
multiReadT = timely.promise(multiRead);
multiMyBalanceT = timely.promise(multiMyBalance);
multiBalanceT = timely.promise(multiBalance);

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
    console.log("Starting Dapp\n");

    await getMetrics().then((res) => {
        fs.appendFile('metrics.json','{\"StartDApp\":[' + JSON.stringify(res[0]) +','+JSON.stringify(res[1].usedMemMb)+ '],', () => {
        console.log(JSON.stringify(res));
        });
    });

    list = await accountsT();
    myAccount = list[0]; 
    console.log(myAccount);

    await depositInContractT(myAccount,valueToDeposit).then(() => {
            fs.appendFile('output.txt', 'Deposit:       '+depositInContractT.time+'\n', () => {
                    console.log('Deposit:       ' + depositInContractT.time);
            });
    });

    await getMetrics().then((res) => {
        fs.appendFile('metrics.json','\"Deposit\":[' + JSON.stringify(res[0]) +','+JSON.stringify(res[1].usedMemMb)+ '],', () => {
        console.log(JSON.stringify(res));
        });
    });

    await readBalanceDepositedInContractT(myAccount).then((res1) => {
                console.log("Balance of myAccount:      " + res1); 
    });
    await withdrawFromContractT(myAccount, valueToWithdraw).then(() => {
                    fs.appendFile('output.txt', 'Withdraw:      ' + withdrawFromContractT.time+'\n', () => {
                        console.log('Withdraw:      ' + withdrawFromContractT.time);
                    }); 
    });

    await getMetrics().then((res) => {
        fs.appendFile('metrics.json','\"Withdraw\":[' + JSON.stringify(res[0]) +','+JSON.stringify(res[1].usedMemMb)+ '],', () => {
        console.log(JSON.stringify(res));
        });
    });

    await readBalanceDepositedInContractT(myAccount).then((res2) => {
                        fs.appendFile('output.txt', 'ReadBalance:       ' + readBalanceDepositedInContractT.time+'\n', () => {
                            console.log('ReadBalance:       ' + readBalanceDepositedInContractT.time);
                            console.log("Balance of myAccount:      " + res2);
                        }); 
    });

    await getMetrics().then((res) => {
        fs.appendFile('metrics.json','\"ReadBalance\":[' + JSON.stringify(res[0]) +','+JSON.stringify(res[1].usedMemMb)+ '],', () => {
        console.log(JSON.stringify(res));
        });
    });

    await storeInContractT(myAccount,data3,data4).then(() => {
                            fs.appendFile('output.txt', 'StoreInContract:       '+storeInContractT.time+'\n', () => {
                                console.log('StoreInContract:       '+storeInContractT.time);
                            }); 
    });

    await getMetrics().then((res) => {
        fs.appendFile('metrics.json','\"StoreInContract\":[' + JSON.stringify(res[0]) +','+JSON.stringify(res[1].usedMemMb)+ '],', () => {
        console.log(JSON.stringify(res));
        });
    });

    await readFromContractT(myAccount).then((res3) => {
                                fs.appendFile('output.txt', 'ReadFromContract:      ' + readFromContractT.time + '\n', () => {
                                    console.log(res3[0]);
                                    console.log(res3[1]);
                                    console.log(res3[2]);
                                    console.log('ReadFromContract:      ' + readFromContractT.time);
                                });
    });
    
    await getMetrics().then((res) => {
        fs.appendFile('metrics.json','\"ReadFromContract\":[' + JSON.stringify(res[0]) +','+JSON.stringify(res[1].usedMemMb)+ '],', () => {
        console.log(JSON.stringify(res));
        });
    });

    let samples = 10;
    
    //start of multi 10
    await multiDepositT(myAccount,samples,valueToDeposit).then(() => {
        fs.appendFile('output.txt', 'Deposit10:       '+multiDepositT.time+'\n', () => {
            console.log('Deposit10:       ' + multiDepositT.time);
        });
        console.log("DONE after " + multiDepositT.time); 
    });

    await getMetrics().then((res) => {
        fs.appendFile('metrics.json','\"Deposit10\":[' + JSON.stringify(res[0]) +','+JSON.stringify(res[1].usedMemMb)+ '],', () => {
          console.log(JSON.stringify(res));
        });
      });

    await mybalanceT().then((amount) => {
        console.log("CONTRACT BALANCE: " + amount);
    });
    
    await multiWithdrawT(myAccount,samples,valueToWithdraw).then(() => {
        fs.appendFile('output.txt', 'Withdraw10:       '+multiWithdrawT.time+'\n', () => {
            console.log('Withdraw10:       ' + multiWithdrawT.time);
        });
    });

    await getMetrics().then((res) => {
        fs.appendFile('metrics.json','\"Withdraw10\":[' + JSON.stringify(res[0]) +','+JSON.stringify(res[1].usedMemMb)+ '],', () => {
          console.log(JSON.stringify(res));
        });
      });
    
    await multiBalanceT(myAccount,samples).then((res2) => {
        fs.appendFile('output.txt', 'ReadBalance10:       ' + multiBalanceT.time+'\n', () => {
            console.log('ReadBalance10:       ' + multiBalanceT.time);
            console.log('Balance of my Account: ' + res2[0]);
        });
    });

    await getMetrics().then((res) => {
        fs.appendFile('metrics.json','\"ReadBalance10\":[' + JSON.stringify(res[0]) +','+JSON.stringify(res[1].usedMemMb)+ '],', () => {
          console.log(JSON.stringify(res));
        });
      });
    
    await multiStoreT(list,samples,data3,data4).then(() => {
        fs.appendFile('output.txt', 'StoreInContract10:       '+multiStoreT.time+'\n', () => {
            console.log('StoreInContract10:       '+multiStoreT.time);
        });
    });
    
    await getMetrics().then((res) => {
        fs.appendFile('metrics.json','\"StoreInContract10\":[' + JSON.stringify(res[0]) +','+JSON.stringify(res[1].usedMemMb)+ '],', () => {
          console.log(JSON.stringify(res));
        });
      });

    await multiReadT(samples,list).then((res3) => {
        fs.appendFile('output.txt', 'ReadFromContract10:      ' + multiReadT.time + '\n', () => {
            console.log(res3[0][0]);
            console.log(res3[0][1]);
            console.log(res3[0][2]);
            console.log('ReadFromContract10:      ' + multiReadT.time);
        });
    });

    await getMetrics().then((res) => {
        fs.appendFile('metrics.json','\"ReadFromContract10\":[' + JSON.stringify(res[0]) +','+JSON.stringify(res[1].usedMemMb)+ '],', () => {
          console.log(JSON.stringify(res));
        });
      });

    samples = 50;

    //start of multi 50

    await multiDepositT(myAccount,samples,valueToDeposit).then(() => {
        fs.appendFile('output.txt', 'Deposit50:       '+multiDepositT.time+'\n', () => {
            console.log('Deposit50:       ' + multiDepositT.time);
        });
    });

    await getMetrics().then((res) => {
        fs.appendFile('metrics.json','\"Deposit50\":[' + JSON.stringify(res[0]) +','+JSON.stringify(res[1].usedMemMb)+ '],', () => {
          console.log(JSON.stringify(res));
        });
      });
      
    console.log("DONE after " + multiDepositT.time);

    await mybalanceT().then((amount) => {
          console.log("CONTRACT BALANCE: " + amount);
    });

    await multiWithdrawT(myAccount,samples,valueToWithdraw).then(() => {
          fs.appendFile('output.txt', 'Withdraw50:       '+multiWithdrawT.time+'\n', () => {
              console.log('Withdraw50:       ' + multiWithdrawT.time);
          });
    });

    await getMetrics().then((res) => {
        fs.appendFile('metrics.json','\"Withdraw50\":[' + JSON.stringify(res[0]) +','+JSON.stringify(res[1].usedMemMb)+ '],', () => {
          console.log(JSON.stringify(res));
        });
      });

    await multiBalanceT(myAccount,samples).then((res2) => {
        fs.appendFile('output.txt', 'ReadBalance50:       ' + multiBalanceT.time+'\n', () => {
            console.log('ReadBalance50:       ' + multiBalanceT.time);
            console.log('Balance of my Account: ' + res2[0]);
            getMetrics().then((res) => {
                fs.appendFile('metrics.json','\"ReadBalance50\":[' + JSON.stringify(res[0]) +','+JSON.stringify(res[1].usedMemMb)+ '],', () => {
                  console.log(JSON.stringify(res));
                });
              });
        }); 
    });

    await multiStoreT(list,samples,data3,data4).then(() => {
            fs.appendFile('output.txt', 'StoreInContract50:       '+multiStoreT.time+'\n', () => {
                console.log('StoreInContract50:       '+multiStoreT.time);
            });
    });

    await getMetrics().then((res) => {
            fs.appendFile('metrics.json','\"StoreInContract50\":[' + JSON.stringify(res[0]) +','+JSON.stringify(res[1].usedMemMb)+ '],', () => {
              console.log(JSON.stringify(res));
            });
    });

    await multiReadT(samples,list).then((res3) => {
                fs.appendFile('output.txt', 'ReadFromContract50:      ' + multiReadT.time + '\n', () => {
                    console.log(res3[0][0]);
                    console.log(res3[0][1]);
                    console.log(res3[0][2]);
                    console.log('ReadFromContract50:      ' + multiReadT.time);
                });
    });

    await getMetrics().then((res) => {
            fs.appendFile('metrics.json','\"ReadFromContract50\":[' + JSON.stringify(res[0]) +','+JSON.stringify(res[1].usedMemMb)+ '],', () => {
              console.log(JSON.stringify(res));
            });
    });

    samples = 100;

    //start of multi 100

    await  multiDepositT(myAccount,samples,valueToDeposit).then(() => {
        fs.appendFile('output.txt', 'Deposit100:       '+multiDepositT.time+'\n', () => {
            console.log('Deposit100:       ' + multiDepositT.time);
        });
    });
    
    await getMetrics().then((res) => {
        fs.appendFile('metrics.json','\"Deposit100\":[' + JSON.stringify(res[0]) +','+JSON.stringify(res[1].usedMemMb)+ '],', () => {
          console.log(JSON.stringify(res));
        });
    });

    console.log("DONE after " + multiDepositT.time);
    await mybalanceT().then((amount) => {
            console.log("CONTRACT BALANCE: " + amount);
    });

    await multiWithdrawT(myAccount,samples,valueToWithdraw).then(() => {
        fs.appendFile('output.txt', 'Withdraw100:       '+multiWithdrawT.time+'\n', () => {
            console.log('Withdraw100:       ' + multiWithdrawT.time);
        });
    });

    await getMetrics().then((res) => {
        fs.appendFile('metrics.json','\"Withdraw100\":[' + JSON.stringify(res[0]) +','+JSON.stringify(res[1].usedMemMb)+ '],', () => {
          console.log(JSON.stringify(res));
        });
    });

    await multiBalanceT(myAccount,samples).then((res2) => {
            fs.appendFile('output.txt', 'ReadBalance100:       ' + multiBalanceT.time+'\n', () => {
                console.log('ReadBalance100:       ' + multiBalanceT.time);
                console.log('Balance of my Account: ' + res2[0]);
            });
    });

    await getMetrics().then((res) => {
        fs.appendFile('metrics.json','\"ReadBalance100\":[' + JSON.stringify(res[0]) +','+JSON.stringify(res[1].usedMemMb)+ '],', () => {
          console.log(JSON.stringify(res));
        });
    });

    await multiStoreT(list,samples,data3,data4).then(() => {
        fs.appendFile('output.txt', 'StoreInContract100:       '+multiStoreT.time+'\n', () => {
            console.log('StoreInContract100:       '+multiStoreT.time);
        });
    });
    
    await getMetrics().then((res) => {
        fs.appendFile('metrics.json','\"StoreInContract100\":[' + JSON.stringify(res[0]) +','+JSON.stringify(res[1].usedMemMb)+ '],', () => {
          console.log(JSON.stringify(res));
        });
    });
        
    await multiReadT(samples,list).then((res3) => {
            fs.appendFile('output.txt', 'ReadFromContract100:      ' + multiReadT.time + '\n', () => {
                console.log(res3[0][0]);
                console.log(res3[0][1]);
                console.log(res3[0][2]);
                console.log('ReadFromContract100:      ' + multiReadT.time);
            });
            
    });
    await getMetrics().then((res) => {
        fs.appendFile('metrics.json','\"ReadFromContract100\":[' + JSON.stringify(res[0]) +','+JSON.stringify(res[1].usedMemMb)+ '],', () => {
          console.log(JSON.stringify(res));
        });
    });

    samples = 150;

    //start of multi 100

    await  multiDepositT(myAccount,samples,valueToDeposit).then(() => {
        fs.appendFile('output.txt', 'Deposit150:       '+multiDepositT.time+'\n', () => {
            console.log('Deposit150:       ' + multiDepositT.time);
        });
    });
    
    await getMetrics().then((res) => {
        fs.appendFile('metrics.json','\"Deposit150\":[' + JSON.stringify(res[0]) +','+JSON.stringify(res[1].usedMemMb)+ '],', () => {
          console.log(JSON.stringify(res));
        });
    });

    console.log("DONE after " + multiDepositT.time);
    await mybalanceT().then((amount) => {
            console.log("CONTRACT BALANCE: " + amount);
    });

    await multiWithdrawT(myAccount,samples,valueToWithdraw).then(() => {
        fs.appendFile('output.txt', 'Withdraw150:       '+multiWithdrawT.time+'\n', () => {
            console.log('Withdraw150:       ' + multiWithdrawT.time);
        });
    });

    await getMetrics().then((res) => {
        fs.appendFile('metrics.json','\"Withdraw150\":[' + JSON.stringify(res[0]) +','+JSON.stringify(res[1].usedMemMb)+ '],', () => {
          console.log(JSON.stringify(res));
        });
    });

    await multiBalanceT(myAccount,samples).then((res2) => {
            fs.appendFile('output.txt', 'ReadBalance150:       ' + multiBalanceT.time+'\n', () => {
                console.log('ReadBalance150:       ' + multiBalanceT.time);
                console.log('Balance of my Account: ' + res2[0]);
            });
    });

    await getMetrics().then((res) => {
        fs.appendFile('metrics.json','\"ReadBalance150\":[' + JSON.stringify(res[0]) +','+JSON.stringify(res[1].usedMemMb)+ '],', () => {
          console.log(JSON.stringify(res));
        });
    });

    await multiStoreT(list,samples,data3,data4).then(() => {
        fs.appendFile('output.txt', 'StoreInContract150:       '+multiStoreT.time+'\n', () => {
            console.log('StoreInContract150:       '+multiStoreT.time);
        });
    });
    
    await getMetrics().then((res) => {
        fs.appendFile('metrics.json','\"StoreInContract150\":[' + JSON.stringify(res[0]) +','+JSON.stringify(res[1].usedMemMb)+ '],', () => {
          console.log(JSON.stringify(res));
        });
    });
        
    await multiReadT(samples,list).then((res3) => {
            fs.appendFile('output.txt', 'ReadFromContract150:      ' + multiReadT.time + '\n', () => {
                console.log(res3[0][0]);
                console.log(res3[0][1]);
                console.log(res3[0][2]);
                console.log('ReadFromContract150:      ' + multiReadT.time);
            });
            
    });
    await getMetrics().then((res) => {
        fs.appendFile('metrics.json','\"ReadFromContract150\":[' + JSON.stringify(res[0]) +','+JSON.stringify(res[1].usedMemMb)+ ']}', () => {
          console.log(JSON.stringify(res));
        });
    });

    console.log("End of Dapp.");

};            
             
           
       
main();
