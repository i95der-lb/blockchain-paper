#!/bin/bash

NODES=$1
INITIAL_DIR=$6
EOSIO_CONTRACTS_DIRECTORY="$INITIAL_DIR/eosio.contracts-1.6.1/build/contracts"
CONTRACTS_DIR="$INITIAL_DIR/contracts"
DAPP_DIR="$INITIAL_DIR/dapp"
NEEDED_FILES="$INITIAL_DIR/needed_files"
MAXPEERS=$8
HTTPPORT=$2
P2PPORT=$3
i=1
declare -A KEYS_HTTP_PORTS
declare -A KEYS_P2P_PORTS
declare -A PEERS
declare -a PEER_NAMES
declare -A MAP_ACCNUMTONAME
declare -A PRODUCERS
declare -A DAPP_ACCOUNTS

PERCENTAGE=$4
NODEPORT=$5
TXS=$7
LAST_INDEX="start"
COUNTER=0
KEYS_HTTP_PORTS[$LAST_INDEX]=$HTTPPORT
KEYS_P2P_PORTS[$LAST_INDEX]=$P2PPORT
myipaddress=$(grep `hostname` /etc/hosts | cut -d ' ' -f1 | cut -d$'\t' -f1)
NODE_URL="http://$myipaddress:8000"
STARTGENESIS_COMMAND2=$(cat $NEEDED_FILES/genesis_start.sh)
START_COMMAND2=$(cat $NEEDED_FILES/start.sh)
HARD_COMMAND2=$(cat $NEEDED_FILES/hard_replay.sh)



printarr() { declare -n __p="$1"; for k in "${!__p[@]}"; do printf "%s=%s\n" "$k" "${__p[$k]}" ; done ;  }  
containsElement () {
  local e match="$1"
  shift
  for e; do [[ "$e" == "$match" ]] && echo 1; done
  echo 0
}
mykill () {
    all_instances=$(pgrep -f $1)
    while [ ! -z "$all_instances" ];
    do 
        pkill -f $1
        sleep 5
        all_instances=$(pgrep -f $1)
    done
}


initial_clean() {
    # killall -s SIGKILL nodeos gnome-terminal-server eog keosd cleos node
    mykill nodeos
    mykill cleos
    mykill keosd
    mykill eog
    # cd 
    # cd .local/share/eosio/nodeos/
    # rm -rf data && mkdir data
    cd
    rm -rf eosio-wallet data
    cd $INITIAL_DIR
    rm -rf keys biosboottest $DAPP_DIR/.env $DAPP_DIR/output.txt 
    rm $DAPP_DIR/metrics.json 
    mkdir keys biosboottest
    rm draft.txt
    rm $DAPP_DIR/network-graph $DAPP_DIR/network-graph.png
    rm $DAPP_DIR/pids.txt $DAPP_DIR/cpu_mem.txt 
    touch $DAPP_DIR/pids.txt $DAPP_DIR/cpu_mem.txt
    touch $DAPP_DIR/.env
    echo "MAXPEERS=$MAXPEERS" >> $DAPP_DIR/.env
    echo "NODES=$NODES" >> $DAPP_DIR/.env
    echo "HTTPPORT=$(($HTTPPORT+1))" >> $DAPP_DIR/.env
    echo "LAST_HTTPPORT=$(($HTTPPORT+$NODES+1))" >> $DAPP_DIR/.env
    echo "P2PPORT=$(($P2PPORT+1))" >> $DAPP_DIR/.env
    echo "LAST_P2PPORT=$(($P2PPORT+$NODES+1))" >> $DAPP_DIR/.env
    echo "DAPPPORT=$NODEPORT" >> $DAPP_DIR/.env
}

start_default_wallet() {
    MYPASS=$(cleos wallet create --to-console | cut -d '"' -f 2 | cut -d '.' -f 3 | cut -d ':' -f 2 | cut -d ' ' -f 1)
    echo $MYPASS > keys/pass.txt
}

create_key() {
    local KEYS=$(cleos create key --to-console)
    local PRIVKEY=$(echo $KEYS | cut -d ':' -f 2 | cut -d ' ' -f 2)
    local PUBKEY=$(echo $KEYS | cut -d ':' -f 3 )
    mkdir keys/$1
    touch keys/$1/PRIVKEY.txt
    touch keys/$1/PUBKEY.txt
    echo $PRIVKEY > keys/$1/PRIVKEY.txt
    echo $PUBKEY > keys/$1/PUBKEY.txt
    echo "${1^^}=$PRIVKEY" >> $DAPP_DIR/.env
    cleos wallet import --private-key $PRIVKEY
    if [ "$1" != "eosio" ] && [ "$1" != "eosio_accounts" ] && [ "$1" != "han" ] && [ "$1" != "mycontract" ] && [ "$1" != "testaccount" ] ;
    then
        COUNTER=$((COUNTER+1))
        PEERS+=( [$COUNTER]="$1" )
    fi
    if [ "$1" != "eosio_accounts" ] && [ "$1" != "han" ] && [ "$1" != "mycontract" ] && [ "$1" != "testaccount" ];
    then
        local lasthttpport=${KEYS_HTTP_PORTS[$LAST_INDEX]}
        local lastppport=${KEYS_P2P_PORTS[$LAST_INDEX]}
        KEYS_HTTP_PORTS+=(["$1"]=$((lasthttpport+1)))
        KEYS_P2P_PORTS+=(["$1"]=$((lastppport+1)))
        LAST_INDEX=$1
    fi

}

get_key() {
    cd $INITIAL_DIR
    local NAMEOFKEY=$1
    local WHICHKEY=$2
    if [ "$2" == "PRIVKEY" ]
    then 
        head -n 1 keys/$NAMEOFKEY/PRIVKEY.txt
    elif [ "$2" == "PUBKEY" ]
    then 
        head -n 1 keys/$NAMEOFKEY/PUBKEY.txt
    else 
        abort
    fi
}

generate_genesis() {
    cd needed_files
    local GENESIS_JSON=$(<genesis.json)
    cd ..
    local X=$(get_key eosio PUBKEY)
    local result=$(jq '.initial_key = $newval' --arg newval $X <<< $GENESIS_JSON)
    echo $result > $INITIAL_DIR/biosboottest/genesis.json
}


prepare_files_for_node() {
    local KEYNAME=$1
    local PUBKEY=$(get_key $KEYNAME PUBKEY)
    local PRIVKEY=$(get_key $KEYNAME PRIVKEY)

    local GENESISSTART=$STARTGENESIS_COMMAND2
    local START=$START_COMMAND2
    local HARD=$HARD_COMMAND2

    local MYGENSISSTARTCOMMAND=$(echo "${GENESISSTART/PUBKEY/$PUBKEY}")
    MYGENSISSTARTCOMMAND=$(echo "${MYGENSISSTARTCOMMAND/PRIVKEY/$PRIVKEY}")
    MYGENSISSTARTCOMMAND=$(echo "${MYGENSISSTARTCOMMAND/HTTPPORT/${KEYS_HTTP_PORTS[$KEYNAME]}}")
    MYGENSISSTARTCOMMAND=$(echo "${MYGENSISSTARTCOMMAND/P2PPORT/${KEYS_P2P_PORTS[$KEYNAME]}}")
    MYGENSISSTARTCOMMAND=$(echo "${MYGENSISSTARTCOMMAND/CURDIRNAME/$KEYNAME}")

    local MYSTARTCOMMAND=$(echo "${START/PUBKEY/$PUBKEY}")
    MYSTARTCOMMAND=$(echo "${MYSTARTCOMMAND/PRIVKEY/$PRIVKEY}")
    MYSTARTCOMMAND=$(echo "${MYSTARTCOMMAND/HTTPPORT/${KEYS_HTTP_PORTS[$KEYNAME]}}")
    MYSTARTCOMMAND=$(echo "${MYSTARTCOMMAND/P2PPORT/${KEYS_P2P_PORTS[$KEYNAME]}}")
    MYSTARTCOMMAND=$(echo "${MYSTARTCOMMAND/CURDIRNAME/$KEYNAME}")
    
    local MYHARDCOMMAND=$(echo "${HARD/PUBKEY/$PUBKEY}")
    MYHARDCOMMAND=$(echo "${MYHARDCOMMAND/PRIVKEY/$PRIVKEY}")
    MYHARDCOMMAND=$(echo "${MYHARDCOMMAND/HTTPPORT/${KEYS_HTTP_PORTS[$KEYNAME]}}")
    MYHARDCOMMAND=$(echo "${MYHARDCOMMAND/P2PPORT/${KEYS_P2P_PORTS[$KEYNAME]}}")
    MYHARDCOMMAND=$(echo "${MYHARDCOMMAND/CURDIRNAME/$KEYNAME}")
    
    local mypeers=($(echo "${connectto[${KEYS_P2P_PORTS[$KEYNAME]}]}" | tr " " "\n"))
    x=""
    for V in "${!MAP_ACCNUMTONAME[@]}"; do
        if [ ${MAP_ACCNUMTONAME[$V]} == "$KEYNAME" ];
        then x=$V
        fi
    done

    echo "NODE NAME: $KEYNAME" >> draft.txt
    echo "NODE NUM: $x" >> draft.txt
    echo "NODE PEERS: ${connectto[${KEYS_P2P_PORTS[$KEYNAME]}]}" >> draft.txt
    for k in "${mypeers[@]}";
    do
        local myipaddress=$(grep `hostname` /etc/hosts | cut -d ' ' -f1 | cut -d$'\t' -f1)
        MYGENSISSTARTCOMMAND=$(sed "/^--enable-stale-production \\.*/a --p2p-peer-address $myipaddress:$k \\\\" <<< $MYGENSISSTARTCOMMAND)
        MYSTARTCOMMAND=$(sed "/^--enable-stale-production \\.*/a --p2p-peer-address $myipaddress:$k \\\\" <<< $MYSTARTCOMMAND)
        MYHARDCOMMAND=$(sed "/^--enable-stale-production \\.*/a --p2p-peer-address $myipaddress:$k \\\\" <<< $MYHARDCOMMAND)
        
    done

    mkdir biosboottest/$KEYNAME
    echo -e "$MYGENSISSTARTCOMMAND" > biosboottest/$KEYNAME/genesis_start.sh
    echo -e "$MYSTARTCOMMAND" > biosboottest/$KEYNAME/start.sh
    echo -e "$MYHARDCOMMAND" > biosboottest/$KEYNAME/hard_replay.sh
    cp needed_files/stop.sh biosboottest/$KEYNAME/.
    cp needed_files/clean.sh biosboottest/$KEYNAME/.
    chmod -R +x biosboottest/$KEYNAME
}

manage_peers() {
    local n=1
    local x="account$n"
    while [ $n -lt $NODES ];
    do
    PEER_NAMES+=($x)
    NUM_TO_CHAR=$(echo $n | tr 0-9 a-z)
    MAP_ACCNUMTONAME["account$n"]="account$NUM_TO_CHAR"
    create_key ${MAP_ACCNUMTONAME["account$n"]}
    PRODUCERS["account$n"]="0"
    prepare_files_for_node ${MAP_ACCNUMTONAME["account$n"]}
    n=$((n+1))
    x="account$n"
    done
}

system_accounts() {
    cd $INITIAL_DIR
    local X=$(get_key eosio_accounts PUBKEY)
    cleos --url $NODE_URL create account eosio eosio.bpay $X 
    cleos --url $NODE_URL create account eosio eosio.msig $X
    cleos --url $NODE_URL create account eosio eosio.names $X
    cleos --url $NODE_URL create account eosio eosio.ram $X
    cleos --url $NODE_URL create account eosio eosio.ramfee $X 
    cleos --url $NODE_URL create account eosio eosio.saving $X
    cleos --url $NODE_URL create account eosio eosio.stake $X
    cleos --url $NODE_URL create account eosio eosio.token $X
    cleos --url $NODE_URL create account eosio eosio.vpay $X
    cleos --url $NODE_URL create account eosio eosio.rex $X
    cleos --url $NODE_URL get accounts $X
    cleos --url $NODE_URL set contract eosio.token $EOSIO_CONTRACTS_DIRECTORY/eosio.token/
    sleep 1
    cleos --url $NODE_URL set contract eosio.msig $EOSIO_CONTRACTS_DIRECTORY/eosio.msig/
    sleep 1
    cleos --url $NODE_URL push action eosio.token create '[ "eosio", "10000000000.0000 SYS" ]' -p eosio.token@active
    sleep 1
    cleos --url $NODE_URL push action eosio.token issue '[ "eosio", "1000000000.0000 SYS", "memo" ]' -p eosio@active
    sleep 3
    cleos --url $NODE_URL set contract eosio $EOSIO_CONTRACTS_DIRECTORY/eosio.system/
    sleep 1
    cleos --url $NODE_URL push action eosio setpriv '["eosio.msig", 1]' -p eosio@active
    sleep 1
    cleos --url $NODE_URL push action eosio init '["0", "4,SYS"]' -p eosio@active
}

generate_producers_array() {
    p=$(($PERCENTAGE*$NODES/100))
    local counter=1
    local index=0
    local t=""
    local num=$(($NODES-1))
    while [ $counter -le $p ]
    do
        index=$(shuf -i 1-$num -n 1)
        while [ "${PRODUCERS["account$index"]}" == "1" ] || [ "$(($index-1))" == "$(($NODEPORT-8000))" ]
        do
            index=$(shuf -i 1-$num -n 1)  
        done 
        echo "PRODUCER AT $index" 
        t="${MAP_ACCNUMTONAME[account$index]}"
        PRODUCERS["account$index"]="1"
        counter=$(($counter+1))
    done
}

launch_producers() {
    local n=1
    local Y=""
    local dummy=$P2PPORT
    local oldnetworkgraph=$(cat $DAPP_DIR/network-graph)
    while [ $n -lt $NODES ]
    do
        Y=$(get_key ${MAP_ACCNUMTONAME["account$n"]} PUBKEY)
        if [ "${PRODUCERS["account$n"]}" == "1" ]
        then
            cleos --url $NODE_URL system newaccount eosio --transfer ${MAP_ACCNUMTONAME["account$n"]} $Y --stake-net "1000000.0000 SYS" --stake-cpu "1000000.0000 SYS" --buy-ram-kbytes 12000000
        else
            cleos --url $NODE_URL system newaccount eosio --transfer ${MAP_ACCNUMTONAME["account$n"]} $Y --stake-net "1000.0000 SYS" --stake-cpu "1000.0000 SYS" --buy-ram-kbytes 8192
        fi
        if [ "${PRODUCERS["account$n"]}" == "1" ]
        then
            dummy=$(($P2PPORT+$n))
            changeNetGraph=$(sed "1 a $dummy [color=\"red\"];" "$DAPP_DIR/network-graph")
            echo "$changeNetGraph" > $DAPP_DIR/network-graph
            echo "${MAP_ACCNUMTONAME["account$n"]} is a producer"
            cleos --url $NODE_URL system regproducer ${MAP_ACCNUMTONAME["account$n"]} $Y https://account$n.com
        fi
        n=$(( n+1 ))
    done
}

start_producers() {
    local n=1
    while [ $n -lt $NODES ]
    do
    cd $INITIAL_DIR/biosboottest/${MAP_ACCNUMTONAME["account$n"]}
    sleep 1
    ./genesis_start.sh
    sleep 2
    echo "Started ${MAP_ACCNUMTONAME["account$n"]}" 
    # gnome-terminal --title="${MAP_ACCNUMTONAME["account$n"]}" -e "tail -f blockchain/nodeos.log"
    n=$(( $n+1 ))
    done
}

map_to_peername() {
    local search=$1
    for i in "${!MAP_ACCNUMTONAME[@]}"
    do
        if [ "${MAP_ACCNUMTONAME[$i]}" == "$search" ] ; then
            echo $i
        fi
    done
}

vote_for_producers() {
    local n=1
    local declare line
    local declare line2
    local counter=0
    local TOTAL_PRODUCERS=$(($NODES*$PERCENTAGE/100))
    if [ $TOTAL_PRODUCERS -le 30 ]
    then 
        while [ $n -lt $NODES ]
        do
            if [ "${PRODUCERS["account$n"]}" == "1" ]
            then
                line+=$(echo "${MAP_ACCNUMTONAME["account$n"]} ")
            fi
            n=$(( n+1 ))
        done
        cleos --url $NODE_URL system voteproducer prods accountb $line 
    elif [ $TOTAL_PRODUCERS -le 60 ]
    then 
        while [ $n -lt $NODES ]
        do
            if [ "${PRODUCERS["account$n"]}" == "1" ]
            then
                line+=$(echo "${MAP_ACCNUMTONAME["account$n"]} ")
            fi
            n=$(( n+1 ))
        done
        linearr=($line)
        line2=("${linearr[@]:0:29}")
        line1=("${linearr[@]:30:59}")
        line1=$(echo "${line1[*]}")
        line2=$(echo "${line2[*]}")

        cleos --url $NODE_URL system voteproducer prods accountb $line1
        cleos --url $NODE_URL system voteproducer prods accountc $line2
    elif [ $TOTAL_PRODUCERS -le 90 ]
    then 
        while [ $n -lt $NODES ]
        do
            if [ "${PRODUCERS["account$n"]}" == "1" ]
            then
                line+=$(echo "${MAP_ACCNUMTONAME["account$n"]} ")
            fi
            n=$(( n+1 ))
        done
        linearr=($line)
        line2=("${linearr[@]:0:29}")
        line3=("${linearr[@]:30:59}")
        line1=("${linearr[@]:60:89}")
        line1=$(echo "${line1[*]}")
        line2=$(echo "${line2[*]}")
        line3=$(echo "${line3[*]}")
        cleos --url $NODE_URL system voteproducer prods accountb $line1
        cleos --url $NODE_URL system voteproducer prods accountc $line2
        cleos --url $NODE_URL system voteproducer prods accountd $line3

    fi

}


resign() {
    cleos --url $NODE_URL push action eosio updateauth '{"account": "eosio", "permission": "owner", "parent": "", "auth": {"threshold": 1, "keys": [], "waits": [], "accounts": [{"weight": 1, "permission": {"actor": "eosio.prods", "permission": "active"}}]}}' -p eosio@owner
    cleos --url $NODE_URL push action eosio updateauth '{"account": "eosio", "permission": "active", "parent": "owner", "auth": {"threshold": 1, "keys": [], "waits": [], "accounts": [{"weight": 1, "permission": {"actor": "eosio.prods", "permission": "active"}}]}}' -p eosio@active


    cleos --url $NODE_URL push action eosio updateauth '{"account": "eosio.bpay", "permission": "owner", "parent": "", "auth": {"threshold": 1, "keys": [], "waits": [], "accounts": [{"weight": 1, "permission": {"actor": "eosio", "permission": "active"}}]}}' -p eosio.bpay@owner
    cleos --url $NODE_URL push action eosio updateauth '{"account": "eosio.bpay", "permission": "active", "parent": "owner", "auth": {"threshold": 1, "keys": [], "waits": [], "accounts": [{"weight": 1, "permission": {"actor": "eosio", "permission": "active"}}]}}' -p eosio.bpay@active

    cleos --url $NODE_URL push action eosio updateauth '{"account": "eosio.msig", "permission": "owner", "parent": "", "auth": {"threshold": 1, "keys": [], "waits": [], "accounts": [{"weight": 1, "permission": {"actor": "eosio", "permission": "active"}}]}}' -p eosio.msig@owner
    cleos --url $NODE_URL push action eosio updateauth '{"account": "eosio.msig", "permission": "active", "parent": "owner", "auth": {"threshold": 1, "keys": [], "waits": [], "accounts": [{"weight": 1, "permission": {"actor": "eosio", "permission": "active"}}]}}' -p eosio.msig@active

    cleos --url $NODE_URL push action eosio updateauth '{"account": "eosio.names", "permission": "owner", "parent": "", "auth": {"threshold": 1, "keys": [], "waits": [], "accounts": [{"weight": 1, "permission": {"actor": "eosio", "permission": "active"}}]}}' -p eosio.names@owner
    cleos --url $NODE_URL push action eosio updateauth '{"account": "eosio.names", "permission": "active", "parent": "owner", "auth": {"threshold": 1, "keys": [], "waits": [], "accounts": [{"weight": 1, "permission": {"actor": "eosio", "permission": "active"}}]}}' -p eosio.names@active

    cleos --url $NODE_URL push action eosio updateauth '{"account": "eosio.ram", "permission": "owner", "parent": "", "auth": {"threshold": 1, "keys": [], "waits": [], "accounts": [{"weight": 1, "permission": {"actor": "eosio", "permission": "active"}}]}}' -p eosio.ram@owner
    cleos --url $NODE_URL push action eosio updateauth '{"account": "eosio.ram", "permission": "active", "parent": "owner", "auth": {"threshold": 1, "keys": [], "waits": [], "accounts": [{"weight": 1, "permission": {"actor": "eosio", "permission": "active"}}]}}' -p eosio.ram@active

    cleos --url $NODE_URL push action eosio updateauth '{"account": "eosio.ramfee", "permission": "owner", "parent": "", "auth": {"threshold": 1, "keys": [], "waits": [], "accounts": [{"weight": 1, "permission": {"actor": "eosio", "permission": "active"}}]}}' -p eosio.ramfee@owner
    cleos --url $NODE_URL push action eosio updateauth '{"account": "eosio.ramfee", "permission": "active", "parent": "owner", "auth": {"threshold": 1, "keys": [], "waits": [], "accounts": [{"weight": 1, "permission": {"actor": "eosio", "permission": "active"}}]}}' -p eosio.ramfee@active

    cleos --url $NODE_URL push action eosio updateauth '{"account": "eosio.saving", "permission": "owner", "parent": "", "auth": {"threshold": 1, "keys": [], "waits": [], "accounts": [{"weight": 1, "permission": {"actor": "eosio", "permission": "active"}}]}}' -p eosio.saving@owner
    cleos --url $NODE_URL push action eosio updateauth '{"account": "eosio.saving", "permission": "active", "parent": "owner", "auth": {"threshold": 1, "keys": [], "waits": [], "accounts": [{"weight": 1, "permission": {"actor": "eosio", "permission": "active"}}]}}' -p eosio.saving@active

    cleos --url $NODE_URL push action eosio updateauth '{"account": "eosio.stake", "permission": "owner", "parent": "", "auth": {"threshold": 1, "keys": [], "waits": [], "accounts": [{"weight": 1, "permission": {"actor": "eosio", "permission": "active"}}]}}' -p eosio.stake@owner
    cleos --url $NODE_URL push action eosio updateauth '{"account": "eosio.stake", "permission": "active", "parent": "owner", "auth": {"threshold": 1, "keys": [], "waits": [], "accounts": [{"weight": 1, "permission": {"actor": "eosio", "permission": "active"}}]}}' -p eosio.stake@active

    cleos --url $NODE_URL push action eosio updateauth '{"account": "eosio.token", "permission": "owner", "parent": "", "auth": {"threshold": 1, "keys": [], "waits": [], "accounts": [{"weight": 1, "permission": {"actor": "eosio", "permission": "active"}}]}}' -p eosio.token@owner
    cleos --url $NODE_URL push action eosio updateauth '{"account": "eosio.token", "permission": "active", "parent": "owner", "auth": {"threshold": 1, "keys": [], "waits": [], "accounts": [{"weight": 1, "permission": {"actor": "eosio", "permission": "active"}}]}}' -p eosio.token@active

    cleos --url $NODE_URL push action eosio updateauth '{"account": "eosio.vpay", "permission": "owner", "parent": "", "auth": {"threshold": 1, "keys": [], "waits": [], "accounts": [{"weight": 1, "permission": {"actor": "eosio", "permission": "active"}}]}}' -p eosio.vpay@owner
    cleos --url $NODE_URL push action eosio updateauth '{"account": "eosio.vpay", "permission": "active", "parent": "owner", "auth": {"threshold": 1, "keys": [], "waits": [], "accounts": [{"weight": 1, "permission": {"actor": "eosio", "permission": "active"}}]}}' -p eosio.vpay@active

}

dapp_setup() {
    local Y1=$(get_key testaccount PUBKEY)
    local Y2=$(get_key mycontract PUBKEY)
    local Y3=$(get_key han PUBKEY)
    cleos --url $NODE_URL system newaccount eosio --transfer testaccount $Y1 --stake-net "50.0000 SYS" --stake-cpu "50.0000 SYS" --buy-ram-kbytes 1024 -p eosio@active
    cleos --url $NODE_URL push action eosio.token issue '[ "testaccount", "100.0000 SYS", "memo" ]' -p eosio@active
    cleos --url $NODE_URL system newaccount eosio --transfer mycontract $Y2 --stake-net "50000.0000 SYS" --stake-cpu "50000.0000 SYS" --buy-ram-kbytes 16000 -p eosio@active
    cleos --url $NODE_URL set contract mycontract $CONTRACTS_DIR/mycontract -p mycontract@active
    cleos --url $NODE_URL set account permission mycontract active --add-code
    cleos --url $NODE_URL system newaccount eosio --transfer han $Y3 --stake-net "9000.0000 SYS" --stake-cpu "9000.0000 SYS" --buy-ram-kbytes 8192 -p eosio@active
    cleos --url $NODE_URL push action eosio.token issue '[ "han", "1000.0000 SYS", "Slecht geld verdrijft goed" ]' -p eosio@active
    n=1
    limit=$(($n+$TXS))
    while [ $n -le $limit ];
    do  
        local NUM_TO_CHAR=$(echo $n | tr 0-9 a-z)
        local Y4=$(get_key  "accound$NUM_TO_CHAR" PUBKEY)
        cleos --url $NODE_URL system newaccount eosio --transfer "accound$NUM_TO_CHAR" $Y4 --stake-net "50.0000 SYS" --stake-cpu "50.0000 SYS" --buy-ram-kbytes 1024 -p eosio@active
        n=$(($n+1))
    done
}

extract_pids() {
    echo "$(ps -u ird02 | grep nodeos || ps -u imandernayka | grep nodeos)" > $DAPP_DIR/pids.txt  
    local filename='pids.txt'
    while IFS= read -r line
        do 
            # echo $line
            PIDS_NODEOS=$(echo $line | cut -d ' ' -f1)
            printf "%s: %s\n" "$PIDS_NODEOS" "$(ps -q $PIDS_NODEOS -o pcpu,pmem)" >> $DAPP_DIR/cpu_mem.txt
        done < $filename
}

create_dapp_keys() {
    local KEYS=$(cleos create key --to-console)
    local PRIVKEY=$(echo $KEYS | cut -d ':' -f 2 | cut -d ' ' -f 2)
    local PUBKEY=$(echo $KEYS | cut -d ':' -f 3 )
    mkdir keys/$1
    touch keys/$1/PRIVKEY.txt
    touch keys/$1/PUBKEY.txt
    echo $PRIVKEY > keys/$1/PRIVKEY.txt
    echo $PUBKEY > keys/$1/PUBKEY.txt
    DAPP_ACCOUNTS+=(["$1"]=$PRIVKEY)
    cleos wallet import --private-key $PRIVKEY

}

dapp_accounts() {
    n=1
    limit=$(($n+$TXS))
    while [ $n -le $limit ];
    do
        local NUM_TO_CHAR=$(echo $n | tr 0-9 a-z)
        create_dapp_keys "accound$NUM_TO_CHAR"
        n=$(($n+1))
    done
}


cd $INITIAL_DIR
initial_clean
cd $DAPP_DIR
node generate-mst.js
declare -A connectto
declare -a mytemparr
input="$DAPP_DIR/network-graph"
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

cd $INITIAL_DIR
start_default_wallet
create_key eosio
create_key eosio_accounts
create_key mycontract
create_key han
create_key testaccount
dapp_accounts

generate_genesis
prepare_files_for_node eosio
manage_peers
cd $INITIAL_DIR/biosboottest/eosio/
sleep 1
./genesis_start.sh
sleep 2
# gnome-terminal --title=eosio -e "tail -f blockchain/nodeos.log"
system_accounts
generate_producers_array
for K in "${!PRODUCERS[@]}"; do echo $K --- ${PRODUCERS[$K]}; done
for K in "${!PRODUCERS[@]}"; do echo $K --- ${PRODUCERS[$K]}; done
for K in "${!PRODUCERS[@]}"; do echo $K --- ${PRODUCERS[$K]}; done

launch_producers
for K in "${!PRODUCERS[@]}"; do echo $K --- ${PRODUCERS[$K]}; done
cleos --url $NODE_URL system listproducers 
dapp_setup
start_producers
cd $INITIAL_DIR
vote_for_producers
cleos --url $NODE_URL system listproducers 
resign
cleos --url $NODE_URL system listproducers
dapp_accounts_json="{\"accounts\":["
for K in "${!DAPP_ACCOUNTS[@]}"; 
do 
    key=$K
    val=${DAPP_ACCOUNTS[$K]}
    dapp_accounts_json+=$(echo {\"$key\":\"$val\"},)
done
dapp_accounts_json=${dapp_accounts_json::-1}
dapp_accounts_json+="]}"

sleep 10

cd $DAPP_DIR
TIME=$(date)
echo "Started DApp at: $TIME" >> $DAPP_DIR/time.txt

node app.js $dapp_accounts_json
# # sleep 10
# node app-multi-10.js $dapp_accounts_json
# # sleep 10
# node app-multi-50.js $dapp_accounts_json
# # sleep 10
# node app-multi-100.js $dapp_accounts_json
# sleep 10
extract_pids

TIME=$(date)
echo "Ended DApp at: $TIME" >> time.txt
echo "}" >> $DAPP_DIR/network-graph
./draw-graph.sh


# xdg-open network-graph.png

# rm -rf $INITIAL_DIR/biosboottest $INITIAL_DIR/keys



