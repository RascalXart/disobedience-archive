#!/bin/bash

# Script to find your Cloudflare Account ID using the API

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${YELLOW}Cloudflare Account ID Finder${NC}"
echo ""

if [ -z "$CF_API_TOKEN" ]; then
    echo -e "${YELLOW}Enter your Cloudflare API Token:${NC}"
    read -s CF_API_TOKEN
    echo ""
fi

echo -e "${YELLOW}Fetching your accounts...${NC}"

# Get list of accounts
RESPONSE=$(curl -s -X GET "https://api.cloudflare.com/client/v4/accounts" \
    -H "Authorization: Bearer ${CF_API_TOKEN}" \
    -H "Content-Type: application/json")

# Check if jq is available
if command -v jq &> /dev/null; then
    SUCCESS=$(echo "$RESPONSE" | jq -r '.success')
    
    if [ "$SUCCESS" = "true" ]; then
        RESULT_COUNT=$(echo "$RESPONSE" | jq '.result | length')
        
        if [ "$RESULT_COUNT" -eq 0 ]; then
            echo -e "${YELLOW}No accounts found. Trying alternative method...${NC}"
            echo ""
            echo -e "${YELLOW}Let's try to get it from your Pages project:${NC}"
            echo "Enter your Pages project name (e.g., 'disobedience-archive'):"
            read PROJECT_NAME
            
            # Try to list all Pages projects (this might reveal the account ID)
            echo -e "${YELLOW}Fetching Pages projects...${NC}"
            PAGES_RESPONSE=$(curl -s -X GET "https://api.cloudflare.com/client/v4/pages/projects" \
                -H "Authorization: Bearer ${CF_API_TOKEN}" \
                -H "Content-Type: application/json")
            
            echo "$PAGES_RESPONSE" | jq '.'
        else
            echo -e "${GREEN}✓ Found your accounts:${NC}"
            echo ""
            echo "$RESPONSE" | jq -r '.result[] | "Account: \(.name)\nAccount ID: \(.id)\n---"'
        fi
    else
        echo -e "${RED}Error: Failed to fetch accounts.${NC}"
        echo "Response:"
        echo "$RESPONSE" | jq '.'
        echo ""
        echo -e "${YELLOW}Possible issues:${NC}"
        echo "1. API token might not have 'Account:Read' permission"
        echo "2. API token might be invalid"
        echo ""
        echo -e "${YELLOW}Alternative: Find Account ID manually${NC}"
        echo "1. Go to your Cloudflare Pages project"
        echo "2. Check the browser's Network tab when loading the project"
        echo "3. Look for API calls - Account ID is in the URL"
        exit 1
    fi
else
    echo "$RESPONSE"
    echo ""
    echo -e "${YELLOW}Install 'jq' for better formatting: brew install jq${NC}"
fi

