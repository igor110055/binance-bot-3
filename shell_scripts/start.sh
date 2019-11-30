#!/bin/bash
current=$(basename "$(pwd)")
pm2 start binance.js --name "${current}"
echo "Forever restarted."