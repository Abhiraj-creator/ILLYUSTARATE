# Cypress E2E Testing with AI Integration

This directory contains end-to-end tests for ILLYUSTRATE with AI-powered test generation capabilities.

## Quick Start

```bash
# Open Cypress Test Runner
npm run cypress:open

# Run tests headlessly
npm run test:e2e:headless

# Run with dev server
npm run test:e2e
```

## AI-Powered Test Generation

### Generate Tests with AI

```bash
# Generate a test using AI
npm run test:generate -- "Test user can add a repository"

# Or with more context
npm run test:generate -- "Verify graph visualization renders correctly with 100+ nodes"
```

### How It Works

1. The script sends your feature description to an AI model (Groq or Gemini)
2. AI generates comprehensive Cypress test code
3. The test is saved to `cypress/e2e/ai-generated-*.cy.ts`
4. You can review and modify the generated test

### AI Configuration

Set these in your `.env` file:

```env
VITE_AI_PROVIDER=groq  # or 'gemini'
VITE_AI_API_KEY=your-api-key
VITE_AI_MODEL=mixtral-8x7b-32768  # or 'gemini-pro'
```

## Test Structure

```
cypress/
├── e2e/                    # End-to-end tests
│   ├── auth.cy.ts         # Authentication tests
│   ├── dashboard.cy.ts    # Dashboard tests
│   ├── graph.cy.ts        # Graph visualization tests
│   └── ai-generated-*.ts  # AI-generated tests
├── support/               # Support files
│   ├── e2e.ts            # Global configuration
│   └── commands.ts       # Custom commands
├── services/              # Test services
│   └── AITestGenerator.ts # AI test generation service
└── fixtures/              # Test data
```

## Custom Commands

### Authentication
```typescript
cy.mockSupabaseAuth()     // Mock authenticated user
cy.login(email, password) // Login with credentials
```

### Graph Visualization
```typescript
cy.waitForGraph()         // Wait for graph to render
```

### AI Generation
```typescript
cy.generateTest('description')  // Generate test with AI
```

### Utilities
```typescript
cy.dataCy('selector')           // Get by data-cy attribute
cy.findByTestId('testId')       // Get by data-testid
cy.measurePerformance(callback) // Measure performance
cy.checkA11y()                  // Check accessibility
```

## Writing Tests

### Basic Test Structure

```typescript
describe('Feature Name', () => {
  beforeEach(() => {
    cy.mockSupabaseAuth()
    cy.visit('/dashboard')
  })

  it('should do something', () => {
    // Arrange
    cy.intercept('GET', '**/api/data', { fixture: 'data.json' })
    
    // Act
    cy.get('[data-cy="button"]').click()
    
    // Assert
    cy.contains('Success').should('be.visible')
  })
})
```

### Best Practices

1. **Use data attributes for selectors:**
   ```typescript
   cy.get('[data-cy="submit-button"]')  // ✅ Good
   cy.get('.btn-primary')               // ❌ Avoid
   ```

2. **Mock external APIs:**
   ```typescript
   cy.intercept('GET', '**/github.com/**', { fixture: 'repos.json' })
   ```

3. **Use sessions for authentication:**
   ```typescript
   cy.session('user', () => {
     cy.login('user@example.com', 'password')
   })
   ```

4. **Add test IDs to components:**
   ```tsx
   <button data-cy="add-repo-button">Add Repository</button>
   ```

## VS Code Integration

### Recommended Extensions

- **Cypress** - Official Cypress extension
- **Cypress Helper** - Enhanced Cypress support

### Features

- IntelliSense for custom commands
- CodeLens for running tests
- Automatic test discovery

## Troubleshooting

### Tests failing due to network

Add to your test:
```typescript
cy.intercept('GET', '**/supabase.co/**', (req) => {
  // Mock or allow
}).as('supabase')
```

### Graph not rendering

Increase timeout:
```typescript
cy.waitForGraph() // Already has 10s timeout
```

### AI generation failing

Check your API key:
```bash
echo $VITE_AI_API_KEY
```

## Continuous Integration

Example GitHub Actions workflow:

```yaml
name: E2E Tests
on: [push]
jobs:
  cypress:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: cypress-io/github-action@v5
        with:
          start: npm run dev
          wait-on: 'http://localhost:5174'
```

## Resources

- [Cypress Documentation](https://docs.cypress.io)
- [Best Practices](https://docs.cypress.io/guides/references/best-practices)
- [API Reference](https://docs.cypress.io/api/table-of-contents)
