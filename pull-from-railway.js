#!/usr/bin/env node

/**
 * Script to pull content from Railway deployment
 * Usage: node pull-from-railway.js <railway-url>
 * Example: node pull-from-railway.js https://your-app.railway.app
 */

const https = require('https');
const http = require('http');
const fs = require('fs-extra');
const path = require('path');

const RAILWAY_URL = process.argv[2];

if (!RAILWAY_URL) {
    console.error('Usage: node pull-from-railway.js <railway-url>');
    console.error('Example: node pull-from-railway.js https://your-app.railway.app');
    process.exit(1);
}

const DATA_DIR = path.join(__dirname, 'data');
const CONTENT_FILE = path.join(DATA_DIR, 'content.json');

// Normalize URL (remove trailing slash)
const baseUrl = RAILWAY_URL.replace(/\/$/, '');
const contentUrl = `${baseUrl}/api/content`;

function fetchContent(url) {
    return new Promise((resolve, reject) => {
        const client = url.startsWith('https') ? https : http;
        
        console.log(`Fetching content from: ${url}`);
        
        client.get(url, {
            headers: {
                'Accept': 'application/json'
            }
        }, (res) => {
            let data = '';
            
            res.on('data', (chunk) => {
                data += chunk;
            });
            
            res.on('end', () => {
                if (res.statusCode === 200) {
                    try {
                        const json = JSON.parse(data);
                        resolve(json);
                    } catch (error) {
                        reject(new Error(`Failed to parse JSON: ${error.message}`));
                    }
                } else {
                    reject(new Error(`HTTP ${res.statusCode}: ${data}`));
                }
            });
        }).on('error', (error) => {
            reject(error);
        });
    });
}

async function main() {
    try {
        // Ensure data directory exists
        await fs.ensureDir(DATA_DIR);
        console.log('Data directory ensured:', DATA_DIR);
        
        // Fetch content from Railway
        const content = await fetchContent(contentUrl);
        console.log('Content fetched successfully');
        
        // Backup existing content if it exists
        if (await fs.pathExists(CONTENT_FILE)) {
            const backupPath = `${CONTENT_FILE}.backup.${Date.now()}`;
            await fs.copy(CONTENT_FILE, backupPath);
            console.log(`Backed up existing content to: ${backupPath}`);
        }
        
        // Save content to local file
        await fs.writeJson(CONTENT_FILE, content, { spaces: 2 });
        console.log(`Content saved to: ${CONTENT_FILE}`);
        console.log('\n✅ Successfully pulled content from Railway!');
        
    } catch (error) {
        console.error('❌ Error:', error.message);
        process.exit(1);
    }
}

main();



