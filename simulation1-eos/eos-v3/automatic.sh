NODES=11
NODES2=$(($NODES-1))
HTTPPORT=7999
P2PPORT=8999
PERCENTAGE=25
NODEPORT=8005
TXS=320
MAXPEERS=6
n=1
SAMPLES=10
INITIAL_DIR=$(pwd)
PATH_TO_SAVE="$INITIAL_DIR"/../results
PATH_TO_NODES="$INITIAL_DIR/biosboottest"
PATH_TO_DAPP="$INITIAL_DIR/dapp"
rm -rf $INITIAL_DIR/Measurements
mkdir $INITIAL_DIR/Measurements
mykill () {
    all_instances=$(pgrep -f $1)
    while [ ! -z "$all_instances" ];
    do 
        pkill -f $1
        sleep 5
        all_instances=$(pgrep -f $1)
    done
}

while [ "$NODES2" -ge "150" ]; do
    mkdir Measurements/"$NODES2"
    mypath="$INITIAL_DIR"/Measurements/"$NODES2"
    
    while [ "$n" -le "$SAMPLES" ]; do
        mykill nodeos
        mykill cleos
        mykill keosd
        TIME=$(date)
        echo "Started Sample at: $TIME" > $PATH_TO_DAPP/time.txt
        ./myscript.sh $NODES $HTTPPORT $P2PPORT $PERCENTAGE $NODEPORT $INITIAL_DIR $TXS $MAXPEERS 
        TIME=$(date)
        echo "Ended Sample at: $TIME" >> $PATH_TO_DAPP/time.txt
        cp $PATH_TO_DAPP/time.txt $mypath/"$n-time.txt"
        cp $PATH_TO_DAPP/output.txt $mypath/"$n-output.txt"
        cp $PATH_TO_DAPP/.env $mypath/"$n.env"
        cp $PATH_TO_DAPP/cpu_mem.txt $mypath/"$n.cpu_mem.txt"
        cp $PATH_TO_DAPP/network-graph $mypath/"$n.network-graph"
        cp $PATH_TO_DAPP/network-graph.png $mypath/"$n-network-graph.png"
        cp $PATH_TO_DAPP/metrics.json $mypath/"$n-metrics.json"
        cp $INITIAL_DIR/biosboottest/accountf/blockchain/nodeos.log $mypath/"$n-nodeos.log"
        TIME=$(date)
        echo "Ended Copy at: $TIME" >> $mypath/"$n-time.txt"
        mykill nodeos
        mykill cleos
        mykill keosd
        # killall -s SIGKILL nodeos cleos keosd node
        # killall -s SIGKILL nodeos cleos keosd node
        rm -rf $INITIAL_DIR/biosboottest $INITIAL_DIR/keys $PATH_TO_DAPP/output.txt $PATH_TO_DAPP/network-graph
        rm -rf $PATH_TO_DAPP/pids.txt $PATH_TO_DAPP/cpu_mem.txt $PATH_TO_DAPP/network-graph.png $PATH_TO_DAPP/.env
        rm -rf $PATH_TO_DAPP/metrics.json 
        n=`expr "$n" + 1`;
    done
    n=1
    if [ "$NODES2" -eq "50" ]
    then 
    NODES=`expr "$NODES" - 40`
    NODES2=$(($NODES-1))
    else
    NODES=`expr "$NODES" - 50`
    NODES2=$(($NODES-1))
    fi
done
TIME=$(date)
cd $INITIAL_DIR
cp -r Measurements $PATH_TO_SAVE/"$TIME"
# killall -s SIGKILL nodeos cleos keosd node
mykill nodeos
mykill cleos
mykill keosd
