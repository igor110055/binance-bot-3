#!/bin/bash
current=$(basename "$(pwd)")
pm2 start "${current}"
echo "Forever restarted."