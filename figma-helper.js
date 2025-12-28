const https = require('https');

const FIGMA_TOKEN = process.env.FIGMA_TOKEN || '';
const FIGMA_API_BASE = 'https://api.figma.com/v1';

// Helper function to make Figma API requests
function figmaRequest(endpoint) {
  return new Promise((resolve, reject) => {
    const url = `${FIGMA_API_BASE}${endpoint}`;
    const options = {
      headers: {
        'X-Figma-Token': FIGMA_TOKEN
      }
    };

    https.get(url, options, (res) => {
      let data = '';

      res.on('data', (chunk) => {
        data += chunk;
      });

      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          if (res.statusCode === 200) {
            resolve(json);
          } else {
            reject(new Error(`Figma API error: ${res.statusCode} - ${json.err || data}`));
          }
        } catch (error) {
          reject(new Error(`Failed to parse response: ${error.message}`));
        }
      });
    }).on('error', (error) => {
      reject(error);
    });
  });
}

// Get user info
async function getMe() {
  return await figmaRequest('/me');
}

// Get file
async function getFile(fileKey) {
  return await figmaRequest(`/files/${fileKey}`);
}

// Get file nodes
async function getFileNodes(fileKey, nodeIds) {
  const ids = Array.isArray(nodeIds) ? nodeIds.join(',') : nodeIds;
  return await figmaRequest(`/files/${fileKey}/nodes?ids=${ids}`);
}

// Get images from file
async function getImages(fileKey, nodeIds, options = {}) {
  const ids = Array.isArray(nodeIds) ? nodeIds.join(',') : nodeIds;
  const params = new URLSearchParams({
    ids: ids,
    ...options
  });
  return await figmaRequest(`/images/${fileKey}?${params.toString()}`);
}

// Get teams
async function getTeams() {
  return await figmaRequest('/teams');
}

// Get projects for a team
async function getTeamProjects(teamId) {
  return await figmaRequest(`/teams/${teamId}/projects`);
}

// Get files for a project
async function getProjectFiles(projectId) {
  return await figmaRequest(`/projects/${projectId}/files`);
}

// Search for files by name
async function searchFiles(searchQuery) {
  const teams = await getTeams();
  const results = [];
  
  for (const team of teams.teams || []) {
    try {
      const projects = await getTeamProjects(team.id);
      for (const project of projects.projects || []) {
        try {
          const files = getProjectFiles(project.id);
          for (const file of files.files || []) {
            if (file.name && file.name.toLowerCase().includes(searchQuery.toLowerCase())) {
              results.push({
                name: file.name,
                key: file.key,
                lastModified: file.lastModified,
                thumbnailUrl: file.thumbnail_url,
                project: {
                  name: project.name,
                  id: project.id
                },
                team: {
                  name: team.name,
                  id: team.id
                }
              });
            }
          }
        } catch (err) {
          console.warn(`Error fetching files for project ${project.id}:`, err.message);
        }
      }
    } catch (err) {
      console.warn(`Error fetching projects for team ${team.id}:`, err.message);
    }
  }
  
  return results;
}

// Export functions
module.exports = {
  getMe,
  getFile,
  getFileNodes,
  getImages,
  getTeams,
  getTeamProjects,
  getProjectFiles,
  searchFiles
};

// CLI usage
if (require.main === module) {
  const command = process.argv[2];
  const args = process.argv.slice(3);

  (async () => {
    try {
      switch (command) {
        case 'me':
          const me = await getMe();
          console.log(JSON.stringify(me, null, 2));
          break;
        case 'file':
          if (!args[0]) {
            console.error('Usage: node figma-helper.js file <file-key>');
            process.exit(1);
          }
          const file = await getFile(args[0]);
          console.log(JSON.stringify(file, null, 2));
          break;
        case 'nodes':
          if (!args[0] || !args[1]) {
            console.error('Usage: node figma-helper.js nodes <file-key> <node-id-1> [node-id-2] ...');
            process.exit(1);
          }
          const nodes = await getFileNodes(args[0], args.slice(1));
          console.log(JSON.stringify(nodes, null, 2));
          break;
        case 'search':
          if (!args[0]) {
            console.error('Usage: node figma-helper.js search <query>');
            process.exit(1);
          }
          const searchResults = await searchFiles(args[0]);
          console.log(JSON.stringify(searchResults, null, 2));
          break;
        case 'teams':
          const teams = await getTeams();
          console.log(JSON.stringify(teams, null, 2));
          break;
        default:
          console.log('Figma API Helper');
          console.log('Usage:');
          console.log('  node figma-helper.js me                    - Get user info');
          console.log('  node figma-helper.js file <file-key>        - Get file data');
          console.log('  node figma-helper.js nodes <file-key> <ids> - Get specific nodes');
          console.log('  node figma-helper.js search <query>         - Search for files');
          console.log('  node figma-helper.js teams                  - List teams');
          break;
      }
    } catch (error) {
      console.error('Error:', error.message);
      process.exit(1);
    }
  })();
}
