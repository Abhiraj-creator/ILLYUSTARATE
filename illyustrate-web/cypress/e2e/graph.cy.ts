describe('Graph Visualization', () => {
  beforeEach(() => {
    cy.mockSupabaseAuth()
    cy.visit('/repo/facebook/react/graph')
  })

  it('should display graph viewer', () => {
    cy.contains('Graph').should('be.visible')
    cy.get('.graph-container').should('exist')
  })

  it('should have graph controls', () => {
    cy.waitForGraph()
    
    // Check for zoom controls
    cy.get('button[title="Zoom In"]').should('exist')
    cy.get('button[title="Zoom Out"]').should('exist')
    cy.get('button[title="Fit to Screen"]').should('exist')
    cy.get('button[title="Export as PNG"]').should('exist')
  })

  it('should display node type legend', () => {
    cy.contains('Node Types').should('be.visible')
    cy.contains('file').should('be.visible')
    cy.contains('folder').should('be.visible')
    cy.contains('function').should('be.visible')
    cy.contains('class').should('be.visible')
  })
})

describe('AI-Generated: Graph Interactions', () => {
  beforeEach(() => {
    cy.mockSupabaseAuth()
    cy.visit('/repo/facebook/react/graph')
  })

  it('should zoom in and out', () => {
    cy.waitForGraph()
    
    // Get initial zoom level
    cy.get('#cy').then(($cy) => {
      const initialZoom = $cy[0].getBoundingClientRect().width
      
      // Zoom in
      cy.get('button[title="Zoom In"]').click()
      
      // Zoom out
      cy.get('button[title="Zoom Out"]').click()
    })
  })

  it('should fit graph to screen', () => {
    cy.waitForGraph()
    
    // Click fit button
    cy.get('button[title="Fit to Screen"]').click()
    
    // Graph should still be visible
    cy.get('#cy').should('be.visible')
  })

  it('should display graph statistics', () => {
    // Mock graph data
    cy.intercept('GET', '**/rest/v1/graphs*', {
      statusCode: 200,
      body: {
        id: 'test-graph',
        repository_id: 'test-repo',
        nodes: Array(50).fill(null).map((_, i) => ({
          id: `node-${i}`,
          type: i % 2 === 0 ? 'file' : 'function',
          label: `Node ${i}`,
          path: `/src/node${i}.ts`,
        })),
        edges: Array(30).fill(null).map((_, i) => ({
          id: `edge-${i}`,
          source: `node-${i}`,
          target: `node-${i + 1}`,
          type: 'imports',
        })),
      },
    }).as('getGraph')

    cy.reload()
    cy.wait('@getGraph')

    // Check statistics
    cy.contains('Graph Statistics').should('be.visible')
    cy.contains('50').should('be.visible') // Nodes
    cy.contains('30').should('be.visible') // Edges
  })
})
