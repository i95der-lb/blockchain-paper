#!/bin/bash
TIME=$(date)
echo "Started DApp at: $TIME" >> time.txt
node ethereum/deploy.js > deploy.txt 
FA=$(sed '2q;d' deploy.txt | cut -d ":" -f2)
MYCONTRACT_ADDRESS=$(echo $FA | cut -c 1-)
echo "MYCONTRACT_ADDRESS=$MYCONTRACT_ADDRESS" >> .env
sleep 10
node app.js
TIME=$(date)
echo "Ended DApp at: $TIME" >> time.txt
node get-connections.js "$myminers"
./draw-graph.sh
dot -Tpng network-graph-2 -o network-graph-2.png

# xdg-open network-graph.png