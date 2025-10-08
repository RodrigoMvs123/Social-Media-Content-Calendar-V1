#!/bin/bash

echo "🐳 Social Media Content Calendar - Docker Deployment"
echo ""

# Check if .env.docker exists
if [ ! -f ".env.docker" ]; then
    echo "⚠️  .env.docker file not found!"
    echo "📋 Please create .env.docker from template:"
    echo "   cp .env.docker.template .env.docker"
    echo "   # Then edit .env.docker with your actual values"
    echo ""
    exit 1
fi

echo "Choose your database option:"
echo "1) PostgreSQL (Production)"
echo "2) SQLite (Development)" 
echo "3) Hybrid (PostgreSQL + SQLite fallback)"
echo ""
read -p "Enter choice (1-3): " choice

# Check for detached mode flag
DETACHED_FLAG=""
if [[ "$1" == "-d" ]]; then
    DETACHED_FLAG="-d"
    echo "🔧 Running in detached mode..."
fi

case $choice in
  1)
    echo "🚀 Starting with PostgreSQL..."
    docker-compose --profile postgres up $DETACHED_FLAG
    ;;
  2)
    echo "🚀 Starting with SQLite..."
    docker-compose --profile sqlite up $DETACHED_FLAG
    ;;
  3)
    echo "🚀 Starting with Hybrid approach..."
    docker-compose --profile hybrid up $DETACHED_FLAG
    ;;
  *)
    echo "❌ Invalid choice. Please run again and select 1, 2, or 3."
    exit 1
    ;;
esac