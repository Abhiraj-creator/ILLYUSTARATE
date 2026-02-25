// Cypress E2E Support File
import './commands'
import 'cypress-axe'

// AI-Powered Test Utilities
declare global {
  namespace Cypress {
    interface Chainable {
      /**
       * Generate test code using AI based on feature description
       */
      generateAITest(feature: string, context?: string): Chainable<string>
      
      /**
       * Login with test user
       */
      login(email?: string, password?: string): Chainable<void>
      
      /**
       * Mock Supabase authentication
       */
      mockSupabaseAuth(): Chainable<void>
      
      /**
       * Wait for graph to be rendered
       */
      waitForGraph(): Chainable<void>
      
      /**
       * Check accessibility
       */
      checkA11y(context?: string): Chainable<void>
    }
  }
}

// Custom Commands
cy.generateAITest = (feature: string, context?: string) => {
  return cy.task('generateTestWithAI', { feature, context })
}

Cypress.Commands.add('login', (email = 'test@example.com', password = 'testpassword123') => {
  cy.session([email, password], () => {
    cy.visit('/login')
    cy.get('input[type="email"]').type(email)
    cy.get('input[type="password"]').type(password)
    cy.get('button[type="submit"]').click()
    cy.url().should('include', '/dashboard')
  })
})

Cypress.Commands.add('mockSupabaseAuth', () => {
  cy.intercept('GET', '**/auth/v1/user', {
    statusCode: 200,
    body: {
      id: 'test-user-id',
      email: 'test@example.com',
      user_metadata: {
        full_name: 'Test User',
      },
    },
  }).as('getUser')
  
  cy.intercept('GET', '**/auth/v1/session', {
    statusCode: 200,
    body: {
      access_token: 'test-token',
      user: {
        id: 'test-user-id',
        email: 'test@example.com',
      },
    },
  }).as('getSession')
})

Cypress.Commands.add('waitForGraph', () => {
  cy.get('.graph-container', { timeout: 10000 }).should('be.visible')
  cy.get('#cy', { timeout: 10000 }).should('exist')
})

Cypress.Commands.add('checkA11y', (context = 'body') => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (cy as any).injectAxe()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ;(cy as any).checkA11y(context, {
    runOnly: {
      type: 'tag',
      values: ['wcag2a', 'wcag2aa'],
    },
  })
})

// Global beforeEach
beforeEach(() => {
  // Mock API calls that might fail during tests
  cy.intercept('POST', '**/auth/v1/token*', {
    statusCode: 200,
    body: { access_token: 'test-token' },
  }).as('authToken')
})

// Handle uncaught exceptions
Cypress.on('uncaught:exception', (err) => {
  // Return false to prevent Cypress from failing the test
  if (err.message.includes('Supabase')) {
    return false
  }
  return true
})
