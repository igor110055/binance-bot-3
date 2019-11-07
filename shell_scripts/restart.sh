#!/bin/bash
current=$(basename "$(pwd)")
echo "Forever restarting.."
forever restart "${current}"
echo "Forever restarted."