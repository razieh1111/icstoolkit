#!/bin/bash
echo "Launching ICS Toolkit..."

# Navigate to the directory where this script is located
cd "$(dirname "$0")"

echo "Installing dependencies..."
npm install

echo "Starting the app..."
npm run dev

# Keep the terminal open after the app starts
read -p "Press any key to close this window..."