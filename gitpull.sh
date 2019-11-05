#!/bin/bash
echo ‘post-receive: Triggered.’
cd "$(dirname "$0")"
git pull