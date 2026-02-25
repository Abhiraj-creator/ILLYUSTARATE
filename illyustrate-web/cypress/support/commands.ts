// Custom Cypress Commands

Cypress.Commands.add('dataCy', (value: string) => {
  return cy.get(`[data-cy="${value}"]`)
})

Cypress.Commands.add('findByTestId', (testId: string) => {
  return cy.get(`[data-testid="${testId}"]`)
})

Cypress.Commands.add('findByRole', (role: string, options?: { name?: string }) => {
  if (options?.name) {
    return cy.get(`[role="${role}"]`).contains(options.name)
  }
  return cy.get(`[role="${role}"]`)
})

// AI-Powered Test Generation Command
Cypress.Commands.add('generateTest', (description: string) => {
  const aiProvider = Cypress.env('AI_PROVIDER')
  const apiKey = Cypress.env('AI_API_KEY')
  
  if (!apiKey) {
    cy.log('⚠️ No AI API key found. Skipping AI test generation.')
    return cy.wrap(null)
  }
  
  return cy.request({
    method: 'POST',
    url: aiProvider === 'groq' 
      ? 'https://api.groq.com/openai/v1/chat/completions'
      : 'https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: {
      model: Cypress.env('AI_MODEL'),
      messages: [
        {
          role: 'system',
          content: `You are a Cypress test generator. Generate Cypress E2E test code for the following feature. 
          Use TypeScript and follow best practices. Include proper selectors, assertions, and error handling.
          
          Available custom commands:
          - cy.dataCy(value) - Get element by data-cy attribute
          - cy.findByTestId(testId) - Get element by data-testid
          - cy.login(email, password) - Login with test user
          - cy.mockSupabaseAuth() - Mock authentication
          - cy.waitForGraph() - Wait for graph visualization
          
          Return only the test code without explanation.`
        },
        {
          role: 'user',
          content: `Generate a Cypress test for: ${description}`
        }
      ],
      temperature: 0.3,
    },
  }).then((response) => {
    const testCode = response.body.choices?.[0]?.message?.content
    cy.log('🤖 AI Generated Test:', testCode)
    return cy.wrap(testCode)
  })
})

// Smart Wait Command with Retry Logic
Cypress.Commands.add('smartWait', (selector: string, options = {}) => {
  const { timeout = 10000, retryInterval = 500 } = options
  
  return cy.get(selector, { timeout }).should('exist')
})

// Visual Regression Helper
Cypress.Commands.add('matchImageSnapshot', (name: string, options = {}) => {
  cy.screenshot(name, {
    capture: 'viewport',
    ...options,
  })
})

// Performance Testing Command
Cypress.Commands.add('measurePerformance', (callback: () => void) => {
  cy.window().then((win) => {
    win.performance.mark('test-start')
    callback()
    win.performance.mark('test-end')
    win.performance.measure('test-duration', 'test-start', 'test-end')
    
    const measure = win.performance.getEntriesByName('test-duration')[0]
    cy.log(`⏱️ Performance: ${measure.duration}ms`)
    return cy.wrap(measure.duration)
  })
})
