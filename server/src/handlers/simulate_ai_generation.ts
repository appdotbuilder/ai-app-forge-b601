import { db } from '../db';
import { projectsTable, filesTable } from '../db/schema';
import { type Project } from '../schema';
import { eq } from 'drizzle-orm';

export async function simulateAIGeneration(projectId: number): Promise<{ 
    project: Project; 
    generatedFiles: Array<{ path: string; name: string; content: string; is_folder: boolean }> 
}> {
    try {
        // First, get the project details
        const projects = await db.select()
            .from(projectsTable)
            .where(eq(projectsTable.id, projectId))
            .execute();

        if (projects.length === 0) {
            throw new Error(`Project with id ${projectId} not found`);
        }

        const project = projects[0];

        // Generate files based on the AI prompt - simulate different project types
        const generatedFiles = generateFilesFromPrompt(project.ai_prompt, project.name);

        // Insert generated files into the database
        for (const file of generatedFiles) {
            await db.insert(filesTable)
                .values({
                    project_id: projectId,
                    path: file.path,
                    name: file.name,
                    content: file.content,
                    is_folder: file.is_folder,
                    parent_path: getParentPath(file.path)
                })
                .execute();
        }

        return {
            project: {
                id: project.id,
                user_id: project.user_id,
                name: project.name,
                description: project.description,
                ai_prompt: project.ai_prompt,
                slug: project.slug,
                is_deployed: project.is_deployed,
                deployment_url: project.deployment_url,
                created_at: project.created_at,
                updated_at: project.updated_at
            },
            generatedFiles
        };
    } catch (error) {
        console.error('AI generation simulation failed:', error);
        throw error;
    }
}

function generateFilesFromPrompt(aiPrompt: string, projectName: string): Array<{ path: string; name: string; content: string; is_folder: boolean }> {
    const promptLower = aiPrompt.toLowerCase();
    
    // Detect project type from prompt - order matters, check full stack first
    if (promptLower.includes('full stack') || promptLower.includes('fullstack')) {
        return generateFullStackProject(projectName);
    } else if (promptLower.includes('api') || promptLower.includes('backend') || promptLower.includes('server') || promptLower.includes('express') || promptLower.includes('node.js')) {
        return generateAPIProject(projectName);
    } else if (promptLower.includes('react') || promptLower.includes('frontend') || promptLower.includes('ui')) {
        return generateReactProject(projectName);
    } else {
        return generateBasicProject(projectName);
    }
}

function generateReactProject(projectName: string): Array<{ path: string; name: string; content: string; is_folder: boolean }> {
    return [
        {
            path: '/src',
            name: 'src',
            content: '',
            is_folder: true
        },
        {
            path: '/public',
            name: 'public',
            content: '',
            is_folder: true
        },
        {
            path: '/package.json',
            name: 'package.json',
            content: `{
  "name": "${sanitizeProjectName(projectName)}",
  "version": "1.0.0",
  "private": true,
  "dependencies": {
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "typescript": "^4.9.5"
  },
  "scripts": {
    "start": "react-scripts start",
    "build": "react-scripts build"
  }
}`,
            is_folder: false
        },
        {
            path: '/src/App.tsx',
            name: 'App.tsx',
            content: `import React from 'react';
import './App.css';

function App() {
  return (
    <div className="App">
      <header className="App-header">
        <h1>Welcome to ${projectName}</h1>
        <p>Your React application is ready!</p>
      </header>
    </div>
  );
}

export default App;`,
            is_folder: false
        },
        {
            path: '/src/index.tsx',
            name: 'index.tsx',
            content: `import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

const root = ReactDOM.createRoot(
  document.getElementById('root') as HTMLElement
);

root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);`,
            is_folder: false
        },
        {
            path: '/src/App.css',
            name: 'App.css',
            content: `.App {
  text-align: center;
}

.App-header {
  background-color: #282c34;
  padding: 20px;
  color: white;
  min-height: 50vh;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
}`,
            is_folder: false
        },
        {
            path: '/public/index.html',
            name: 'index.html',
            content: `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${projectName}</title>
</head>
<body>
    <div id="root"></div>
</body>
</html>`,
            is_folder: false
        }
    ];
}

function generateAPIProject(projectName: string): Array<{ path: string; name: string; content: string; is_folder: boolean }> {
    return [
        {
            path: '/src',
            name: 'src',
            content: '',
            is_folder: true
        },
        {
            path: '/package.json',
            name: 'package.json',
            content: `{
  "name": "${sanitizeProjectName(projectName)}",
  "version": "1.0.0",
  "main": "src/server.js",
  "dependencies": {
    "express": "^4.18.2",
    "cors": "^2.8.5"
  },
  "scripts": {
    "start": "node src/server.js",
    "dev": "nodemon src/server.js"
  }
}`,
            is_folder: false
        },
        {
            path: '/src/server.js',
            name: 'server.js',
            content: `const express = require('express');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.get('/', (req, res) => {
    res.json({ message: 'Welcome to ${projectName} API' });
});

app.get('/api/health', (req, res) => {
    res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

app.listen(PORT, () => {
    console.log(\`${projectName} API server running on port \${PORT}\`);
});`,
            is_folder: false
        },
        {
            path: '/README.md',
            name: 'README.md',
            content: `# ${projectName}

A Node.js API server built with Express.

## Getting Started

1. Install dependencies:
   \`\`\`
   npm install
   \`\`\`

2. Start the server:
   \`\`\`
   npm start
   \`\`\`

## Endpoints

- \`GET /\` - Welcome message
- \`GET /api/health\` - Health check`,
            is_folder: false
        }
    ];
}

function generateFullStackProject(projectName: string): Array<{ path: string; name: string; content: string; is_folder: boolean }> {
    return [
        {
            path: '/frontend',
            name: 'frontend',
            content: '',
            is_folder: true
        },
        {
            path: '/backend',
            name: 'backend',
            content: '',
            is_folder: true
        },
        {
            path: '/package.json',
            name: 'package.json',
            content: `{
  "name": "${sanitizeProjectName(projectName)}",
  "version": "1.0.0",
  "private": true,
  "workspaces": [
    "frontend",
    "backend"
  ],
  "scripts": {
    "dev": "concurrently \\"npm run dev --workspace=backend\\" \\"npm run dev --workspace=frontend\\"",
    "build": "npm run build --workspace=frontend && npm run build --workspace=backend"
  },
  "devDependencies": {
    "concurrently": "^7.6.0"
  }
}`,
            is_folder: false
        },
        {
            path: '/frontend/package.json',
            name: 'package.json',
            content: `{
  "name": "${sanitizeProjectName(projectName)}-frontend",
  "version": "1.0.0",
  "dependencies": {
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "axios": "^1.3.0"
  },
  "scripts": {
    "start": "react-scripts start",
    "build": "react-scripts build",
    "dev": "react-scripts start"
  }
}`,
            is_folder: false
        },
        {
            path: '/backend/package.json',
            name: 'package.json',
            content: `{
  "name": "${sanitizeProjectName(projectName)}-backend",
  "version": "1.0.0",
  "main": "server.js",
  "dependencies": {
    "express": "^4.18.2",
    "cors": "^2.8.5"
  },
  "scripts": {
    "start": "node server.js",
    "dev": "nodemon server.js"
  }
}`,
            is_folder: false
        },
        {
            path: '/frontend/src',
            name: 'src',
            content: '',
            is_folder: true
        },
        {
            path: '/frontend/src/App.js',
            name: 'App.js',
            content: `import React, { useState, useEffect } from 'react';
import axios from 'axios';

function App() {
  const [message, setMessage] = useState('');

  useEffect(() => {
    axios.get('http://localhost:3001/')
      .then(response => setMessage(response.data.message))
      .catch(error => console.error('Error:', error));
  }, []);

  return (
    <div className="App">
      <h1>${projectName}</h1>
      <p>Backend message: {message}</p>
    </div>
  );
}

export default App;`,
            is_folder: false
        },
        {
            path: '/backend/server.js',
            name: 'server.js',
            content: `const express = require('express');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

app.get('/', (req, res) => {
    res.json({ message: 'Hello from ${projectName} backend!' });
});

app.listen(PORT, () => {
    console.log(\`Backend server running on port \${PORT}\`);
});`,
            is_folder: false
        }
    ];
}

function generateBasicProject(projectName: string): Array<{ path: string; name: string; content: string; is_folder: boolean }> {
    return [
        {
            path: '/README.md',
            name: 'README.md',
            content: `# ${projectName}

A basic project generated from your AI prompt.

## Getting Started

This project structure has been created based on your requirements. Add your specific implementation details here.`,
            is_folder: false
        },
        {
            path: '/src',
            name: 'src',
            content: '',
            is_folder: true
        },
        {
            path: '/src/index.js',
            name: 'index.js',
            content: `// ${projectName}
// Generated from AI prompt

console.log('Hello from ${projectName}!');

// Add your implementation here`,
            is_folder: false
        },
        {
            path: '/package.json',
            name: 'package.json',
            content: `{
  "name": "${sanitizeProjectName(projectName)}",
  "version": "1.0.0",
  "main": "src/index.js",
  "scripts": {
    "start": "node src/index.js"
  }
}`,
            is_folder: false
        }
    ];
}

function getParentPath(filePath: string): string | null {
    const parts = filePath.split('/').filter(part => part !== '');
    if (parts.length <= 1) {
        return null;
    }
    return '/' + parts.slice(0, -1).join('/');
}

function sanitizeProjectName(projectName: string): string {
    return projectName.toLowerCase()
        .replace(/[^a-z0-9\s-]/g, '') // Remove all special characters except spaces and hyphens
        .replace(/\s+/g, '-')         // Replace spaces with hyphens
        .replace(/-+/g, '-')          // Replace multiple hyphens with single hyphen
        .replace(/^-|-$/g, '');       // Remove leading/trailing hyphens
}