#!/bin/bash
mkdir -p _locales                  # Create directory if not there
for file in ./i18n/*.json; do      # Loop
  iso=$(basename "$file" .json)    # Extract basename
  mkdir -p "_locales/$iso"         # Create corresponding dir
  jq 'del(.["@metadata"]) | with_entries(.key |= gsub("-"; "_") | .value |= {"message": .}) | with_entries(.value.description |= "")' "$file" > "_locales/$iso/messages.json"
done
echo "Done creating ./_locales/{iso}/messages.json"

