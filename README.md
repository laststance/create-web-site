# create-web-site

Scaffold a minimal HTML/CSS/JS project with Node.js development server.

A CLI tool to instantly generate simple web projects, like a super lightweight version of create-react-app.

## Features

- 🚀 Minimal HTML/CSS/JS setup
- 📦 Built-in Node.js development server
- ⚡ Zero dependencies (Node.js standard library only)
- 🎯 ESM (import/export) support
- 🛠️ Start developing immediately

## Usage

```bash
npx @laststance/create-web-site my-app
cd my-app
node server.js
```

Open http://localhost:3000 in your browser to see the generated page.

## Generated Project Structure

```
my-app/
├── package.json
├── server.js      # Node.js development server
├── index.html     # Main HTML file
├── style.css      # Stylesheet
└── main.js        # JavaScript entry point
```

## Development Server

The generated project includes a simple static file server:

```bash
# Start with default port (3000)
node server.js

# Start with custom port
PORT=8080 node server.js
```

You can also use the `dev` script in `package.json`:

```bash
pnpm dev
# or
npm run dev
```

## Future Enhancements

Planned features:

- ✅ Live reload (auto-reload on file changes)
- ✅ Template selection (--template option)
  - HTML Only
  - Tailwind CSS
  - Three.js
- ✅ CLI options expansion
  - `--port <number>` - Specify port number
  - `--no-install` - Skip package.json generation

## License

MIT

## Author

[laststance](https://github.com/laststance)
