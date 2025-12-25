# Wits & Wagers

A digital implementation of the Wits & Wagers party game built with Next.js. Players answer trivia questions with numerical answers, then bet on whose answer they think is closest to the correct answer without going over.

## 🎮 Play Online

**[Play Wits & Wagers](https://yourusername.github.io/wits-and-wagers/)**

## Game Rules

1. **Setup**: Add 2-7 players to the game
2. **Answering**: Each round, all players submit their numerical answer to a trivia question
3. **Betting**: Players place bets on which answer they think is closest without going over
4. **Scoring**: Points are awarded based on:
   - Having the winning answer (closest without going over)
   - Betting on the winning answer
   - Round bonuses increase as the game progresses

## Getting Started

### Prerequisites

- Node.js 20+
- npm

### Installation

```bash
npm install
```

### Development

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to play.

### Build for Production

```bash
npm run build
```

## Testing

This project follows **Test-Driven Development (TDD)** with comprehensive test coverage.

### Unit Tests (Vitest)

Tests for the core game logic:

```bash
npm test              # Run all unit tests
npm test -- --watch   # Watch mode
npm run test:coverage # With coverage report
```

### End-to-End Tests (Playwright)

Full game flow tests:

```bash
npm run test:e2e      # Headless
npm run test:e2e:ui   # With Playwright UI
```

## Architecture

```
lib/game-engine/
├── core/           # Pure game logic (framework-agnostic)
└── react/          # React hooks for state management

app/                # Next.js UI layer

e2e/                # Playwright end-to-end tests
```

## Deployment

The app is automatically deployed to GitHub Pages on push to `main`. It's configured to run under the `/wits-and-wagers` base path.

## License

MIT
