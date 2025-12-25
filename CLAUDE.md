# CLAUDE.md

## Development Philosophy

This project follows **Test-Driven Development (TDD)**. When implementing new features or fixing bugs:

1. **Write tests first** - Define expected behavior before implementation
2. **Run tests to see them fail** - Verify the test is testing the right thing
3. **Implement the feature** - Write the minimum code to make tests pass
4. **Refactor** - Clean up while keeping tests green

## Architecture

The codebase follows a layered architecture with clear separation of concerns:

- **Game Logic Layer** (`lib/game-engine/core/`) - Pure TypeScript game engine, framework-agnostic
- **React Hook Layer** (`lib/game-engine/react/`) - React bindings for the game engine
- **Next.js UI Layer** (`app/`) - UI components and pages

## Running Tests

### Unit Tests (Vitest)

Unit tests cover the core game logic in `lib/game-engine/core/`.

```bash
# Run all unit tests
npm test

# Run tests in watch mode (recommended during development)
npm test -- --watch

# Run tests with UI
npm run test:ui

# Run tests with coverage report
npm run test:coverage
```

### End-to-End Tests (Playwright)

E2E tests cover full user flows through the browser in `e2e/`.

```bash
# Run all e2e tests (headless)
npm run test:e2e

# Run e2e tests with Playwright UI (recommended for debugging)
npm run test:e2e:ui

# Run e2e tests in headed mode (see the browser)
npm run test:e2e -- --headed
```

## Test Structure

```
lib/game-engine/__tests__/core/   # Unit tests for game engine
  ├── answer-manager.test.ts
  ├── betting-manager.test.ts
  ├── game-engine.test.ts
  ├── question-manager.test.ts
  ├── round-manager.test.ts
  ├── scoring-engine.test.ts
  └── setup.test.ts

e2e/                              # End-to-end tests
  └── full-game.spec.ts           # Complete 7-player game flow
```

## Development Workflow

1. Start the dev server: `npm run dev`
2. Run unit tests in watch mode: `npm test -- --watch`
3. After completing a feature, run e2e tests: `npm run test:e2e`

