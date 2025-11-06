#!/usr/bin/env node
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Get project name from command line arguments
const projectName = process.argv[2];

// Validate project name
if (!projectName) {
  console.error('❌ Error: Please provide a project name.');
  console.error('\nUsage:');
  console.error('  npx create-web-site <project-name>');
  console.error('\nExample:');
  console.error('  npx create-web-site my-web-site');
  process.exit(1);
}

// Validate project name format
const validProjectName = /^[a-z0-9-_]+$/i;
if (!validProjectName.test(projectName)) {
  console.error('❌ Error: Project name can only contain letters, numbers, hyphens, and underscores.');
  process.exit(1);
}

const targetDir = path.join(process.cwd(), projectName);

// Check if directory already exists
if (fs.existsSync(targetDir)) {
  console.error(`❌ Error: Directory "${projectName}" already exists.`);
  console.error('Please choose a different project name or remove the existing directory.');
  process.exit(1);
}

try {
  // Create project directory
  console.log(`\n📁 Creating project directory: ${projectName}`);
  fs.mkdirSync(targetDir, { recursive: true });

  // Copy template files
  console.log('📄 Copying template files...');
  const templatesDir = path.join(__dirname, '..', 'templates');
  const templateFiles = fs.readdirSync(templatesDir);

  templateFiles.forEach(file => {
    const srcPath = path.join(templatesDir, file);
    const destPath = path.join(targetDir, file);
    fs.copyFileSync(srcPath, destPath);
    console.log(`  ✓ ${file}`);
  });

  // Create package.json for the new project
  console.log('📦 Creating package.json...');
  const packageJson = {
    name: projectName,
    version: '1.0.0',
    type: 'module',
    scripts: {
      dev: 'node server.js',
      start: 'node server.js'
    }
  };

  fs.writeFileSync(
    path.join(targetDir, 'package.json'),
    JSON.stringify(packageJson, null, 2)
  );
  console.log('  ✓ package.json');

  // Success message
  console.log('\n✅ Success! Created', projectName, 'at', targetDir);
  console.log('\nNext steps:');
  console.log(`  cd ${projectName}`);
  console.log('  node server.js');
  console.log('\nOr using npm/pnpm:');
  console.log('  npm run dev');
  console.log('  # or');
  console.log('  pnpm dev');
  console.log('\nThen open http://localhost:3000 in your browser.');
  console.log('\nHappy coding! 🚀');

} catch (error) {
  console.error('\n❌ Error creating project:', error.message);

  // Cleanup on error
  if (fs.existsSync(targetDir)) {
    console.log('Cleaning up...');
    fs.rmSync(targetDir, { recursive: true, force: true });
  }

  process.exit(1);
}
