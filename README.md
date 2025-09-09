# SpecStory TypeScript SDK - Internal Development Guide

This is the internal development guide for the SpecStory TypeScript SDK. For public documentation, see `templates/typescript-sdk/README.md`.

## Prerequisites

- Node.js 18+ (recommended: use `nvm`)
- npm or yarn
- TypeScript knowledge

## Quick Local Setup

Want to use the SDK locally right away? Here's the fastest way:

```bash
# From monorepo root
cd typescript && npm install && npm run build && npm link

# Then in your project
npm link @specstory/sdk
```

That's it! Now you can use the SDK:
```typescript
import { Client } from '@specstory/sdk';
const client = new Client({ apiKey: 'your-api-key-here' });
```

## Project Structure

```
typescript/
├── src/              # Source code
│   ├── client.ts     # Main client implementation
│   ├── resources/    # API resource implementations
│   ├── errors.ts     # Error classes
│   └── types/        # TypeScript type definitions
├── tests/            # Test files
├── examples/         # Example usage scripts
├── dist/             # Compiled output (git-ignored)
└── coverage/         # Test coverage reports (git-ignored)
```

## Getting Started

### 1. Install Dependencies

```bash
cd typescript
npm install
```

### 2. Set Up Environment

Create a `.env` file (copy from `.env.example`):
```bash
cp .env.example .env
# Edit .env and add your API key
SPECSTORY_API_KEY=your-actual-api-key-here
```

### 3. Build from Source

```bash
# Development build (with source maps)
npm run build

# Production build (optimized)
npm run build:prod

# Watch mode (rebuilds on changes)
npm run build:watch
```

### 4. Run Tests

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage

# Run only unit tests
npm run test:unit

# Run only integration tests (requires API key)
npm run test:integration
```

### 5. Linting and Formatting

```bash
# Run ESLint
npm run lint

# Fix linting issues
npm run lint:fix

# Format code with Prettier
npm run format

# Type check without building
npm run typecheck
```

## Development Workflow

### Running Examples

All examples can be run directly with `tsx`:

```bash
# Basic usage example
npm run example:basic

# Or run any example directly
npx tsx examples/basic-usage.ts

# Run with environment variables
SPECSTORY_API_KEY=your-key npx tsx examples/error-handling.ts
```

### Testing Your Changes

1. **Unit Testing**: Write tests in `tests/unit/`
   ```typescript
   // tests/unit/my-feature.test.ts
   import { describe, it, expect } from 'vitest';
   import { myFeature } from '../../src/my-feature';
   
   describe('myFeature', () => {
     it('should work correctly', () => {
       expect(myFeature()).toBe(true);
     });
   });
   ```

2. **Integration Testing**: Write tests in `tests/integration/`
   - Requires valid API key in environment
   - Tests against real API endpoints
   - Use sparingly to avoid rate limits

### Local Development

To use the SDK locally in another project:

```bash
# In the SDK directory
npm link

# In your project directory
npm link @specstory/sdk
```

### Debugging

1. **VS Code Launch Config** (add to `.vscode/launch.json`):
   ```json
   {
     "type": "node",
     "request": "launch",
     "name": "Debug Example",
     "runtimeExecutable": "npm",
     "runtimeArgs": ["run", "example:basic"],
     "skipFiles": ["<node_internals>/**"],
     "console": "integratedTerminal"
   }
   ```

2. **Enable Debug Logging**:
   ```typescript
   const client = new Client({
     apiKey: process.env.SPECSTORY_API_KEY,
     debug: true
   });
   ```

## Build Output

The build process generates:
- `dist/` - CommonJS and ESM builds
- `dist/types/` - TypeScript declarations
- `dist/index.js` - Main entry (CommonJS)
- `dist/index.mjs` - ESM entry
- `dist/index.d.ts` - Type declarations

## API Key Management

**Never commit API keys!** 

- Use environment variables
- For CI/CD, use GitHub secrets
- For local dev, use `.env` file
- Rotate keys regularly

## Common Issues

### Build Errors

```bash
# Clean and rebuild
npm run clean
npm run build
```

### Type Errors

```bash
# Regenerate types from OpenAPI
npm run generate:types
```

### Test Failures

```bash
# Clear test cache
npm run test -- --clearCache

# Run specific test file
npm test -- client.test.ts
```

## Publishing (Internal)

**Do NOT publish directly to npm!** Use the release workflow:

1. Update version in `package.json`
2. Push to main branch
3. The sync workflow will handle publishing

## Performance Profiling

```bash
# Run performance tests
npm run test:perf

# Generate bundle size report
npm run analyze
```

## Contributing

1. Create feature branch from `main`
2. Make changes and add tests
3. Run `npm run check` (runs all checks)
4. Submit PR with description
5. Ensure all CI checks pass

## Scripts Reference

| Command | Description |
|---------|-------------|
| `npm run build` | Build TypeScript to JavaScript |
| `npm run build:watch` | Build in watch mode |
| `npm test` | Run all tests |
| `npm run lint` | Run ESLint |
| `npm run format` | Format with Prettier |
| `npm run typecheck` | Type check only |
| `npm run clean` | Clean build artifacts |
| `npm run check` | Run all checks (lint, type, test) |
| `npm run example:basic` | Run basic example |
| `npm run generate:types` | Generate types from OpenAPI |

## Architecture Notes

- **Client**: Main entry point, handles auth and request lifecycle
- **Resources**: One class per API resource (projects, sessions, etc.)
- **Request Manager**: Handles retries, caching, and deduplication
- **Error Handling**: Typed errors with context and recovery hints
- **Type Safety**: Full TypeScript with strict mode

## Questions?

- Check `docs/` for architecture decisions
- Review examples in `examples/`
- Ask in #sdk-development Slack channel