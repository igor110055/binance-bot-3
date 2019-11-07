#!/bin/bash
echo ‘post-receive: Triggered.’
current=$(basename "$(pwd)")
echo "$(pwd "$1")"
echo "${current}"
cd "$(dirname "$0")"
git reset --hard
git pull