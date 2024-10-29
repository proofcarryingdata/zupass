#!/bin/sh
# Checks that tsconfig project references are up-to-date.
# 
# See fix-references.sh for an explanation of project references and the
# purpose of these scripts.

yarn workspaces-to-typescript-project-references --tsconfigPath tsconfig.json --check 

retVal=$?
if [ $retVal -ne 0 ]; then
    echo "Missing tsconfig project reference. Run \"yarn fix-references\" to resolve this problem."
    exit 1
fi

yarn workspaces-to-typescript-project-references --tsconfigPath tsconfig.cjs.json --includesRoot --check 1>/dev/null 2>/dev/null

retVal=$?
if [ $retVal -ne 0 ]; then
    echo "Missing tsconfig project reference. Run \"yarn fix-references\" to resolve this problem."
    exit 1
fi

yarn workspaces-to-typescript-project-references --tsconfigPath tsconfig.esm.json --includesRoot --check 1>/dev/null 2>/dev/null

retVal=$?
if [ $retVal -ne 0 ]; then
    echo "Missing tsconfig project reference. Run \"yarn fix-references\" to resolve this problem."
    exit 1
fi

echo "tsconfig project references up to date!"
