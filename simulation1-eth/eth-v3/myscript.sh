#!/bin/bash
PATH_TO_INITIAL_DIRECTORY=$9
PATH_TO_GETH="$PATH_TO_INITIAL_DIRECTORY/nodes"
PATH_TO_DAPP="$PATH_TO_INITIAL_DIRECTORY/performance"


NUMBER=$1
DIFFICULTY=$2
MAXPEERS=$3
MYNODE=$4
MINEORNOT=$5
OTHERMINERS=$6
CONNECTTO=$7
BOOTNODEPORT=$8

PORT=10001
RPCPORT=20001
MYPORT=`expr "$PORT" + "$MYNODE" - 1`
MYRPCPORT=`expr "$RPCPORT" + "$MYNODE" - 1`
DAPPPORT=$(($RPCPORT+$CONNECTTO-1))
INITIAL_PORT=$PORT
LASTPORT=$(($PORT+$NUMBER-1))
INITIAL_RPCPORT=$RPCPORT
LASTRPCPORT=$(($RPCPORT+$NUMBER-1))

declare -A MINERSNEW
b=1
while [ $b -le $NUMBER ];
do
    if [ $b == $MYNODE ]
    then 
        MINERSNEW[$b]="1"
    
    else 
        MINERSNEW[$b]="0"
    fi
    b=$(($b+1))
done
mykill () {
    all_instances=$(pgrep -f $1)
    while [ ! -z "$all_instances" ];
    do 
        pkill -f $1
        sleep 5
        all_instances=$(pgrep -f $1)
    done
}

#initially clean nodes files and kill previous geth and bootnode instances
initial_clean() {
    mkdir $PATH_TO_INITIAL_DIRECTORY/nodes
    cd $PATH_TO_INITIAL_DIRECTORY
    mykill geth
}

create_account() {
    touch $1/password.txt $1/accounts.txt
    echo "1234" >> $1/password.txt
    geth --datadir $1/data account new --password "$1/password.txt"
}

extract_account () {
    local filename=$1/accounts.txt
    echo "$(geth --datadir $1/data account list)" > $filename
    while IFS= read -r line
        do 
            local address=$(echo $line | cut -d"{" -f2 | cut -d"}" -f1)
            accounts+=($address)
        done < $filename
}

setup_bootnode() {
    mkdir $PATH_TO_GETH/bootnode && cd $PATH_TO_GETH/bootnode
    bootnode -genkey bootnode.key
    BOOTNODE_ADDRESS=$(bootnode -nodekey bootnode.key -writeaddress)
    echo "BOOTNODE"
    echo $BOOTNODE_ADDRESS
    nohup bootnode -nodekey bootnode.key -addr :$BOOTNODEPORT &
    # cd $PATH_TO_GETH/"node$MYNODE"
}

setup_genesis () {
    local GENESIS="{
    \"nonce\": \"0x0000000000000042\",
    \"mixhash\": \"0x0000000000000000000000000000000000000000000000000000000000000000\",
    \"difficulty\": \"0x$DIFFICULTY\",
    \"coinbase\": \"0x0000000000000000000000000000000000000000\",
    \"timestamp\": \"0x0\",
    \"parentHash\": \"0x0000000000000000000000000000000000000000000000000000000000000000\",
    \"extraData\": \"0x\",
    \"gasLimit\": \"0xffffffffff\",
    \"config\": {
        \"chainId\": 1995,
        \"homesteadBlock\": 0,
        \"eip155Block\": 0,
        \"eip158Block\": 0
    }
   }"

   local alloc=""
   local JSON=$(ls -t -U | grep -m 1 "genesis.json")
   local counter=0
   for i in "${accounts[@]}"
    do
        local append="\"$i\": {\"balance\":\"0x2337000000000000000000\"}"
        if [ $counter -eq 0 ]
        then
        alloc=$append
        else
        alloc="${alloc},${append}"
        fi
        counter=$(($counter+1))
    done
    RES=$(jq ". + { \"alloc\": {$alloc}}" <<< "$GENESIS")
    echo $RES >| $JSON
}

setup_mynode () {
    cd $PATH_TO_GETH/"node$MYNODE"
    touch genesis.json startGeth.sh start.sh
    chmod +x startGeth.sh
    chmod +x start.sh
    setup_genesis
    geth --datadir data init genesis.json
    if [ "$MINEORNOT" -eq "0" ]; then MINE=""
    else MINE="--mine --miner.threads 1 --miner.etherbase 0"
    fi
    local myipaddress=$(grep `hostname` /etc/hosts | cut -d ' ' -f1 | cut -d$'\t' -f1)
    local COMMAND="geth --datadir data --syncmode \"full\" --nodiscover --allow-insecure-unlock --networkid 4578456 --unlock \"0,1\" --password \"password.txt\" --maxpeers $MAXPEERS --ipcdisable --verbosity 3 --port $MYPORT --rpc --rpcaddr $myipaddress --rpcport $MYRPCPORT --rpcapi \"eth,net,admin,web3,miner,personal\"  --nat \"none\" $MINE"
    echo $COMMAND > startGeth.sh
    echo $COMMAND > start.sh
    sh startGeth.sh >> "geth.log" 2>&1 &
}


other_nodes_nomining () {
    y=1
    cd $PATH_TO_GETH
    while [ "$y" -le "$NUMBER" ]; do
        if [ "$y" -ne "$MYNODE" ]
            then    
                local myipaddress=$(grep `hostname` /etc/hosts | cut -d ' ' -f1 | cut -d$'\t' -f1)
                COMMAND2="geth --datadir data init genesis.json"
                COMMAND3="geth --datadir data --syncmode \"full\" --nodiscover --allow-insecure-unlock --networkid 4578456 --unlock \"0\" --password \"password.txt\" --maxpeers $MAXPEERS --ipcdisable --verbosity 3 --port $PORT --rpc --rpcaddr $myipaddress --rpcport $RPCPORT --rpcapi \"eth,net,admin,web3,miner,personal\"  --nat \"none\""
                cd "node$y"
                cp $PATH_TO_GETH/"node$MYNODE"/genesis.json .
                touch startGeth.sh start.sh
                echo $COMMAND2 > startGeth.sh
                echo $COMMAND3 >> startGeth.sh
                echo $COMMAND3 > start.sh
                chmod +x startGeth.sh
                chmod +x start.sh
                sleep 1
                sh startGeth.sh >> "geth.log" 2>&1 &
                cd $PATH_TO_GETH
            fi
        PORT=$((PORT+1))
        RPCPORT=$((RPCPORT+1))
        y=`expr "$y" + 1`;
    done

}

other_nodes_mining () { 
    y=1
    cd $PATH_TO_GETH
    counter=0
    declare -a MINERS
    m=$(($NUMBER-1))
    MYNODEINARRAY=$(($MYNODE-1))
    while [ $counter -le $m ]; do 
        if [ $counter -ne $MYNODEINARRAY ]
        then
        MINERS[$counter]=-1
        else MINERS[$MYNODEINARRAY]=$MYNODEINARRAY
        fi
        counter=$(($counter+1))
    done
    
    p=$(($PERCENTAGE*$NUMBER/100-$MINEORNOT))
    echo "p is $p"
    counter=0
    while [ $counter -lt $p ]; do
        index=$(shuf -i 1-$NUMBER -n 1)
        i=$(($index-1))
        while [ "$index" == "$MYNODE" ] || [ "$index" == "$CONNECTTO" ] || [ "${MINERS[$i]}" == "$i" ];
        do  
            index=$(shuf -i 1-$NUMBER -n 1)
            i=$(($index-1))
        done
        # echo "$counter : miner is $index" 
        MINERS[$i]=$i
        counter=$(($counter+1))
    done
    CURRENTMINERS=$(echo ${MINERS[*]})
    # echo $CURRENTMINERS
    # sleep 10

    while [ "$y" -le "$NUMBER" ]; do
        if [ "$y" -ne "$MYNODE" ]
            then    
                cd $PATH_TO_GETH/"node$y"
                cp $PATH_TO_GETH/"node$MYNODE"/genesis.json .
                touch startGeth.sh start.sh
                local myipaddress=$(grep `hostname` /etc/hosts | cut -d ' ' -f1 | cut -d$'\t' -f1)
                COMMAND2="geth --datadir data init genesis.json"
                COMMAND3="geth --datadir data --syncmode \"full\" --nodiscover --allow-insecure-unlock --networkid 4578456 --unlock \"0\" --password \"password.txt\" --maxpeers $MAXPEERS --ipcdisable --verbosity 3 --port $PORT --rpc --rpcaddr $myipaddress --rpcport $RPCPORT --rpcapi \"eth,net,admin,web3,miner,personal\"  --nat \"none\""
                COMMAND4="geth --datadir data --syncmode \"full\" --nodiscover --allow-insecure-unlock --networkid 4578456 --unlock \"0\" --password \"password.txt\" --maxpeers $MAXPEERS --ipcdisable --verbosity 3 --port $PORT --rpc --rpcaddr $myipaddress --rpcport $RPCPORT --rpcapi \"eth,net,admin,web3,miner,personal\"  --nat \"none\" --mine --miner.threads 1 --miner.etherbase 0"
                echo $COMMAND2 > startGeth.sh
                b=$(($y-1))
                a=${MINERS[$b]}
                if [ $b -eq $a ]
                    then
                        echo "Mining on node $y" 
                        MINERSNEW[$y]="1"
                        echo $COMMAND4 >> startGeth.sh
                        echo $COMMAND4 > start.sh
                else
                        echo $COMMAND3 >> startGeth.sh
                        echo $COMMAND3 > start.sh
                fi
                chmod +x startGeth.sh
                chmod +x start.sh
                sleep 1
                sh startGeth.sh >> "geth.log" 2>&1 &
                cd $PATH_TO_GETH
            fi
        PORT=$((PORT+1))
        RPCPORT=$((RPCPORT+1))
        y=$(($y+1))
    done
}


extract_pids() {
    cd $PATH_TO_DAPP
    rm pids.txt cpu_mem.txt && touch pids.txt cpu_mem.txt
    echo "$(ps -u ird02 | grep geth || ps -u imandernayka | grep geth)" > pids.txt  
    filename='pids.txt'
    while IFS= read -r line
        do 
            echo $line
            PIDS_GETH=$(echo $line | cut -d ' ' -f1)
            printf "%s: %s\n" "$PIDS_GETH" "$(ps -q $PIDS_GETH -o pcpu,pmem)" >> cpu_mem.txt
        done < $filename
}

set_static_nodes () {
    CURRENTNODEPORT=$1
    CURRENTNODE=$(($1-10000))
    local peersjson="[]"
    local mypeers=($(echo "${connectto[$CURRENTNODEPORT]}" | tr " " "\n"))
    # echo "MYPEERS: $mypeers"
    for k in "${mypeers[@]}";
        do
            local nodenum=$(($k-10000))
            local getenode=$(cat $PATH_TO_GETH/"node$nodenum"/enode.txt) 
            # echo $nodenum $getenode
            RES=$(echo $peersjson | jq ". + [\"$getenode\"]")
            # RES=$(jq ".[] += \"$getenode\"" $peersjson )
            peersjson=$RES

        done
    # echo $peersjson
    echo $peersjson > $PATH_TO_GETH/"node$CURRENTNODE"/data/static-nodes.json
    cd $PATH_TO_GETH/"node$CURRENTNODE" 
    rm -rf geth.log
    sleep 1
    sh start.sh >> "geth.log" 2>&1 &
    echo "Restarted node $CURRENTNODE"
    sleep 2
    # echo "NUMBER OF GETH PROCESSES:"
    # ps -u ird02 | grep geth | wc -l || ps -u imandernayka | grep geth | wc -l

}

initial_clean

cd $PATH_TO_DAPP
echo "MAXPEERS=$MAXPEERS" > .env
echo "NODES=$NUMBER" >> .env
echo "INITIAL_PORT=$INITIAL_PORT" >> .env
echo "LAST_PORT=$LASTPORT" >> .env
echo "INITIAL_RPCPORT=$INITIAL_RPCPORT" >> .env
echo "LAST_RPCPORT=$LASTRPCPORT" >> .env
echo "MYRPCPORT=$DAPPPORT" >> .env
node generate-mst.js
echo "}" >> $PATH_TO_DAPP/network-graph
declare -A connectto
declare -a mytemparr
input="$PATH_TO_DAPP/network-graph"
while IFS= read -r line; do
    if [[ "$line" == *"--"* ]];
    then 
        mytemparr=$(echo $line | sed -e 's/[^0-9 ]//g')
        j=($(echo ${mytemparr[0]} | tr " " "\n")) 
        if [ "${connectto[${j[0]}]}" == "" ]
        then 
            connectto["${j[0]}"]="${j[1]}"
        else 
             connectto["${j[0]}"]="${connectto[${j[0]}]} ${j[1]}"
        fi
        if [ "${connectto[${j[1]}]}" == "" ]
        then 
            connectto["${j[1]}"]="${j[0]}"
        else 
             connectto["${j[1]}"]="${connectto[${j[1]}]} ${j[0]}"
        fi
    fi
done < "$input"

for K in "${!connectto[@]}"; do echo $K --- ${connectto[$K]}; done


cd $PATH_TO_INITIAL_DIRECTORY

if [ "$OTHERMINERS" -eq "1" ]; 
then		
			PERCENTAGE=25
fi

#accounts should have all accounts of all nodes
accounts=()
n=1
while [ "$n" -le "$NUMBER" ]; do
	cp -r nodes-backup/"node$n" $PATH_TO_GETH/.
    extract_account $PATH_TO_GETH/"node$n"
	n=`expr "$n" + 1`;
done


setup_mynode

if [ $OTHERMINERS -eq 0 ]
then other_nodes_nomining
else other_nodes_mining
fi

cd $PATH_TO_DAPP
# sleep 10
node getenodes.js 

myminers=""
if [ $OTHERMINERS -eq 1 ]
then echo "CURRENTMINERS=\"$CURRENTMINERS\"" >> .env
fi
for K in "${!MINERSNEW[@]}"; 
do 
    if [ ${MINERSNEW[$K]} -eq "1" ]
    then
        kk=$(($K+10000))
        myminers+="$kk [color=\"red\"]; "
    fi
done

sed -i "/graph {/a $myminers" "$PATH_TO_DAPP/network-graph"
mykill geth

y=1
cd $PATH_TO_GETH
while [ "$y" -le "$NUMBER" ]; do
    loop=$(($y+10000))
    set_static_nodes $loop
    y=`expr "$y" + 1`;
done

cd $PATH_TO_DAPP
# node get-connections.js "$myminers"
# sleep 60
extract_pids
. ./performance.sh