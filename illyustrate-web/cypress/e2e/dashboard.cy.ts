describe('Dashboard', () => {
  beforeEach(() => {
    cy.mockSupabaseAuth()
    cy.visit('/dashboard')
  })

  it('should display dashboard with repository list', () => {
    cy.contains('Dashboard').should('be.visible')
    cy.contains('Add Repository').should('be.visible')
  })

  it('should show empty state when no repositories', () => {
    // Mock empty repositories response
    cy.intercept('GET', '**/rest/v1/repositories*', {
      statusCode: 200,
      body: [],
    }).as('getRepos')

    cy.reload()
    cy.wait('@getRepos')
    
    cy.contains('No repositories yet').should('be.visible')
    cy.contains('Add Your First Repository').should('be.visible')
  })

  it('should open add repository modal', () => {
    cy.contains('Add Repository').click()
    cy.contains('Add Repository').should('be.visible')
    cy.contains('Load GitHub Repositories').should('be.visible')
  })
})

describe('AI-Generated: Repository Management', () => {
  beforeEach(() => {
    cy.mockSupabaseAuth()
    cy.visit('/dashboard')
  })

  it('should display repository cards with correct information', () => {
    // Mock repositories data
    cy.intercept('GET', '**/rest/v1/repositories*', {
      statusCode: 200,
      body: [
        {
          id: 'test-repo-1',
          owner: 'facebook',
          name: 'react',
          full_name: 'facebook/react',
          description: 'A JavaScript library for building user interfaces',
          language: 'TypeScript',
          stars: 220000,
          size: 50000000,
          status: 'completed',
          is_private: false,
        },
      ],
    }).as('getRepos')

    cy.reload()
    cy.wait('@getRepos')

    // Verify repository card content
    cy.contains('facebook/react').should('be.visible')
    cy.contains('TypeScript').should('be.visible')
    cy.contains('220,000').should('be.visible')
    cy.contains('Analyzed').should('be.visible')
  })

  it('should navigate to repository detail page', () => {
    // Mock repositories
    cy.intercept('GET', '**/rest/v1/repositories*', {
      statusCode: 200,
      body: [
        {
          id: 'test-repo-1',
          owner: 'facebook',
          name: 'react',
          full_name: 'facebook/react',
          status: 'completed',
        },
      ],
    }).as('getRepos')

    cy.reload()
    cy.wait('@getRepos')

    // Click on repository card
    cy.contains('facebook/react').click()
    
    // Should navigate to repository page
    cy.url().should('include', '/repo/facebook/react')
  })
})
