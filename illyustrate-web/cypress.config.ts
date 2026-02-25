import { defineConfig } from 'cypress'

export default defineConfig({
  e2e: {
    baseUrl: 'http://localhost:5174',
    supportFile: 'cypress/support/e2e.ts',
    specPattern: 'cypress/e2e/**/*.cy.ts',
    video: false,
    screenshotOnRunFailure: true,
    viewportWidth: 1280,
    viewportHeight: 720,
    defaultCommandTimeout: 10000,
    requestTimeout: 10000,
    responseTimeout: 10000,
    setupNodeEvents(on, config) {
      // AI Test Generation Plugin
      on('task', {
        generateTestWithAI: async ({ feature, context }) => {
          // This will be implemented with AI service
          return { success: true, test: '' }
        },
        analyzeTestFailure: async ({ error, testCode }) => {
          // AI-powered failure analysis
          return { success: true, analysis: '' }
        },
      })
      
      return config
    },
  },
  component: {
    devServer: {
      framework: 'react',
      bundler: 'vite',
    },
    supportFile: 'cypress/support/component.ts',
    specPattern: 'cypress/component/**/*.cy.tsx',
  },
  env: {
    // AI Configuration for test generation
    AI_PROVIDER: process.env.VITE_AI_PROVIDER || 'groq',
    AI_API_KEY: process.env.VITE_AI_API_KEY,
    AI_MODEL: process.env.VITE_AI_MODEL || 'mixtral-8x7b-32768',
    // Test data
    TEST_USER_EMAIL: 'test@example.com',
    TEST_USER_PASSWORD: 'testpassword123',
    // Feature flags
    ENABLE_AI_TESTS: true,
  },
})
