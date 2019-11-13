#!/bin/bash
current=$(basename "$(pwd)")
echo "Forever restarting.."
pm2 restart "${current}"
echo "Forever restarted."