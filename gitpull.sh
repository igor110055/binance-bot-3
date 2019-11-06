#!/bin/bash
echo ‘post-receive: Triggered.’
current=$(basename "$(pwd)")
echo "${current}"
cd "$(dirname "$0")"
git pull \
&& echo "Forever restarting.." \
&& forever restart "${current}" \
&& echo "Forever restarted." \