#!/bin/bash
DATADIR="./blockchain"
myipaddress=$(grep `hostname` /etc/hosts | cut -d ' ' -f1 | cut -d$'\t' -f1)
if [ ! -d $DATADIR ]; then
  mkdir -p $DATADIR;
fi

nodeos \
--genesis-json $DATADIR"/../../genesis.json" \
--signature-provider PUBKEY=KEY:PRIVKEY \
--plugin eosio::producer_plugin \
--plugin eosio::chain_api_plugin \
--plugin eosio::http_plugin \
--plugin eosio::net_plugin \
--plugin eosio::net_api_plugin \
--plugin eosio::history_api_plugin \
--plugin eosio::history_plugin \
--data-dir $DATADIR"/data" \
--blocks-dir $DATADIR"/blocks" \
--config-dir $DATADIR"/config" \
--producer-name CURDIRNAME \
--http-server-address $myipaddress:HTTPPORT \
--p2p-listen-endpoint $myipaddress:P2PPORT \
--access-control-allow-origin=* \
--contracts-console \
--http-validate-host=false \
--verbose-http-errors \
--enable-stale-production \
--p2p-max-nodes-per-host=5 \
--max-transaction-time=1000 \
--disable-replay-opts \
--state-history-dir $DATADIR"/state" \
--trace-history              \
--chain-state-history        \
>> $DATADIR"/nodeos.log" 2>&1 & \
echo $! > $DATADIR"/eosd.pid"
