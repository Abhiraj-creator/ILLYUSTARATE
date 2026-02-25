describe('Authentication Flow', () => {
  beforeEach(() => {
    cy.visit('/')
  })

  it('should display login page', () => {
    cy.url().should('include', '/login')
    cy.contains('See your codebase. Understand everything.').should('be.visible')
    cy.contains('Continue with GitHub').should('be.visible')
  })

  it('should redirect to dashboard when authenticated', () => {
    cy.mockSupabaseAuth()
    cy.visit('/dashboard')
    cy.url().should('include', '/dashboard')
  })

  it('should protect routes that require authentication', () => {
    cy.visit('/dashboard')
    cy.url().should('include', '/login')
  })
})

describe('AI-Generated: GitHub OAuth Login', () => {
  it('should complete GitHub OAuth flow', () => {
    // Mock the OAuth flow
    cy.intercept('GET', '**/github.com/login/oauth/authorize*', {
      statusCode: 302,
      headers: {
        location: 'http://localhost:5174/dashboard?code=test-code',
      },
    }).as('githubAuth')

    cy.visit('/login')
    cy.contains('Continue with GitHub').click()
    
    // Should redirect to dashboard after OAuth
    cy.url().should('include', '/dashboard')
  })
})

// AI-Generated Test Example
describe('AI-Generated: Login Page Tests', () => {
  beforeEach(() => {
    cy.visit('/login')
  })

  it('should have all required elements', () => {
    // Verify logo and branding
    cy.contains('ILLYUSTRATE').should('be.visible')
    cy.contains('See your codebase. Understand everything.').should('be.visible')
    
    // Verify GitHub login button
    cy.get('button').contains('Continue with GitHub').should('be.visible')
    
    // Verify feature highlights
    cy.contains('Interactive Code Graphs').should('be.visible')
    cy.contains('AI-Generated Documentation').should('be.visible')
    cy.contains('Codebase Chat').should('be.visible')
    cy.contains('Multi-Language Support').should('be.visible')
  })

  it('should be accessible', () => {
    // Check for accessibility issues
    cy.checkA11y()
  })
})
