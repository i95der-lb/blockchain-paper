INC10=10
n=1
SAMPLES=30
DIFF=0
MAXPEERS=6
DEFAULTNODE=1
MINEORNOT=1
OTHERMINERS=1
CONNECTTO=5

INITIAL_DIR=$(pwd)
PATH_TO_SAVE="$INITIAL_DIR"/../results
PATH_TO_NODES="$INITIAL_DIR/nodes"
PATH_TO_DAPP="$INITIAL_DIR/performance"
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

while [ "$INC10" -le "150" ]; do
    mkdir $INITIAL_DIR/Measurements/"$INC10"
    mypath="$INITIAL_DIR/Measurements/$INC10"
    while [ "$n" -le "$SAMPLES" ]; do
        mykill geth
        TIME=$(date)
        echo "Started Sample at: $TIME" > $PATH_TO_DAPP/time.txt
        ./myscript.sh $INC10 $DIFF $MAXPEERS $DEFAULTNODE $MINEORNOT $OTHERMINERS $CONNECTTO $BOOTNODEPORT $INITIAL_DIR
        TIME=$(date)
        echo "Ended Sample at: $TIME" >> $PATH_TO_DAPP/time.txt
        cp $PATH_TO_DAPP/time.txt $mypath/"$n-time.txt"
        cp $PATH_TO_DAPP/output.txt $mypath/"$n-output.txt"
        cp $PATH_TO_DAPP/.env $mypath/"$n.env"
        cp $PATH_TO_DAPP/cpu_mem.txt $mypath/"$n.cpu_mem.txt"
        cp $PATH_TO_DAPP/network-graph $mypath/"$n.network-graph"
        cp $PATH_TO_DAPP/network-graph.png $mypath/"$n-network-graph.png"
        cp $PATH_TO_DAPP/network-graph-2 $mypath/"$n.network-graph-2"
        cp $PATH_TO_DAPP/network-graph-2.png $mypath/"$n-network-graph-2.png"
        cp $PATH_TO_DAPP/metrics.json $mypath/"$n-metrics.json"
        cp $PATH_TO_NODES/"node$CONNECTTO"/geth.log $mypath/"$n.log"
        TIME=$(date)
        echo "Ended Copy at: $TIME" >> $mypath/"$n-time.txt"
        mykill geth
        TIME=$(date)
        echo "Deleting used files at: $TIME" >> $mypath/"$n-time.txt"
        rm -rf $PATH_TO_DAPP/output.txt $PATH_TO_DAPP/.env $PATH_TO_DAPP/cpu_mem.txt $PATH_TO_DAPP/network-graph $PATH_TO_DAPP/network-graph.png $PATH_TO_DAPP/metrics.json 
        rm -rf $PATH_TO_DAPP/deploy.txt $PATH_TO_DAPP/pids.txt $PATH_TO_DAPP/cpu_mem.txt $PATH_TO_DAPP/time.txt $PATH_TO_DAPP/network-graph-2 $PATH_TO_DAPP/network-graph-2.png
        rm -rf $INITIAL_DIR/nodes
        TIME=$(date)
        echo "Done at: $TIME" >> $mypath/"$n-time.txt"
        n=`expr "$n" + 1`;
    done
    n=1
    if [ "$INC10" -eq "10" ]
    then
        INC10=`expr "$INC10" + 40`
    else
        INC10=`expr "$INC10" + 50`
    fi
done

TIME=$(date)
cp -r $INITIAL_DIR/Measurements $PATH_TO_SAVE/"$TIME"
mykill geth

