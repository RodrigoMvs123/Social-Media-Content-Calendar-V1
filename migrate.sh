#!/bin/bash

# Load environment variables from .env file
export $(grep -v '^#' .env | xargs)

# Run the migration command with all arguments passed through
npm run migrate -- "$@"