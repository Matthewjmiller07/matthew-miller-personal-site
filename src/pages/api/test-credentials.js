import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Get directory path
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export async function GET({ request }) {
  try {
    const results = {
      credentialPaths: {},
      credentials: null,
      environment: {
        cwd: process.cwd(),
        dirname: __dirname,
        nodePath: process.env.NODE_PATH,
        env: process.env.NODE_ENV
      }
    };
    
    // Try multiple locations for credentials file
    const possiblePaths = [
      path.join(process.cwd(), 'google-credentials.json'),
      path.join(process.cwd(), './', 'google-credentials.json'),
      path.join(__dirname, '../../..', 'google-credentials.json'),
      path.join(__dirname, '../../../..', 'google-credentials.json'),
      '/Applications/Apps/matthew-miller-personal-site/google-credentials.json'
    ];
    
    // Check each path
    for (const p of possiblePaths) {
      results.credentialPaths[p] = {
        exists: fs.existsSync(p),
        readable: false,
        content: null
      };
      
      if (results.credentialPaths[p].exists) {
        try {
          const content = fs.readFileSync(p, 'utf8');
          results.credentialPaths[p].readable = true;
          results.credentialPaths[p].size = content.length;
          
          // Mask most of the content for security but show enough to verify
          const parsedContent = JSON.parse(content);
          results.credentials = {
            client_email: parsedContent.client_email,
            project_id: parsedContent.project_id,
            private_key_preview: parsedContent.private_key ? 
              `${parsedContent.private_key.substring(0, 30)}...` :
              'missing'
          };
        } catch (e) {
          results.credentialPaths[p].error = e.message;
        }
      }
    }
    
    // Special test - try to use hardcoded credentials for testing
    if (!results.credentials) {
      results.manualCredentialsTest = true;
      results.credentials = {
        client_email: 'aviya-sheets-service@personal-site-460904.iam.gserviceaccount.com',
        project_id: 'personal-site-460904'
      };
      
      // Set TEST_MODE in results to show we're in test mode
      results.TEST_MODE = true;
    }
    
    return new Response(JSON.stringify(results, null, 2), {
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (err) {
    return new Response(JSON.stringify({
      error: err.message,
      stack: err.stack
    }, null, 2), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
