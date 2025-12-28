#!/bin/bash
# Deployment script with proper file permissions

set -e

DEPLOY_DIR="deploy-temp"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
ZIP_FILE="brand-toolkit-deploy-${TIMESTAMP}.zip"

echo "Creating deployment package..."

# Create temporary directory
mkdir -p "${DEPLOY_DIR}"

# Copy files with rsync, preserving structure
rsync -av \
  --exclude='node_modules' \
  --exclude='.git' \
  --exclude='*.log' \
  --exclude='.DS_Store' \
  --exclude='data' \
  --exclude='brand-toolkit-deploy-*' \
  --exclude='brand-toolkit*.zip' \
  --exclude='snapshots' \
  --exclude='deploy-temp' \
  --exclude='deploy.sh' \
  . "${DEPLOY_DIR}/"

# Create data directory structure (empty, so existing data on server isn't overwritten)
echo "Creating data directory structure..."
mkdir -p "${DEPLOY_DIR}/data"
# Create a .gitkeep file to ensure the directory is included
touch "${DEPLOY_DIR}/data/.gitkeep"

# Set proper permissions for all files and directories
echo "Setting file permissions..."
find "${DEPLOY_DIR}" -type d -exec chmod 755 {} \;  # Directories: rwxr-xr-x
find "${DEPLOY_DIR}" -type f -exec chmod 644 {} \;  # Files: rw-r--r--

# Make server.js and package.json scripts executable if needed
if [ -f "${DEPLOY_DIR}/server.js" ]; then
  chmod 755 "${DEPLOY_DIR}/server.js"
fi

# Create zip file
echo "Creating zip archive..."
cd "${DEPLOY_DIR}"
zip -r "../${ZIP_FILE}" . > /dev/null
cd ..

# Cleanup
rm -rf "${DEPLOY_DIR}"

echo "Deployment package created: ${ZIP_FILE}"
echo "$(realpath "${ZIP_FILE}")"
