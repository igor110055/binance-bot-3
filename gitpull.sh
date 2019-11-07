#!/bin/bash
echo ‘post-receive: Triggered.’
current=$(basename "$(pwd)")
echo "${current}"
cd "$(dirname "$0")"
git pull origin master