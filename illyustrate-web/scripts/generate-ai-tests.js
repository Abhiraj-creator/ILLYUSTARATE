#!/usr/bin/env node

/**
 * AI-Powered Test Generation Script
 * 
 * This script uses AI to generate Cypress E2E tests based on feature descriptions.
 * Usage: node scripts/generate-ai-tests.js "Feature description"
 */

const fs = require('fs');
const path = require('path');
const axios = require('axios');

// Configuration
const AI_PROVIDER = process.env.VITE_AI_PROVIDER || 'groq';
const AI_API_KEY = process.env.VITE_AI_API_KEY;
const AI_MODEL = process.env.VITE_AI_MODEL || 'mixtral-8x7b-32768';

if (!AI_API_KEY) {
  console.error('❌ Error: AI_API_KEY not found in environment variables');
  console.log('Please set VITE_AI_API_KEY in your .env file');
  process.exit(1);
}

// Get feature description from command line
const featureDescription = process.argv.slice(2).join(' ');

if (!featureDescription) {
  console.log('🤖 AI Test Generator for ILLYUSTRATE');
  console.log('');
  console.log('Usage:');
  console.log('  npm run test:generate -- "Test user login with GitHub"');
  console.log('  npm run test:generate -- "Verify repository analysis workflow"');
  console.log('');
  console.log('Or directly:');
  console.log('  node scripts/generate-ai-tests.js "Test dashboard loading"');
  process.exit(0);
}

async function generateTest() {
  console.log('🤖 Generating test with AI...');
  console.log(`Feature: ${featureDescription}`);
  console.log('');

  const prompt = `Generate a comprehensive Cypress E2E test for the following feature in the ILLYUSTRATE application:

Feature: ${featureDescription}

Application Context:
- ILLYUSTRATE is an AI-powered codebase visualization tool
- Tech stack: React, TypeScript, Vite, Tailwind CSS, Supabase, Cytoscape.js
- Main features: GitHub OAuth, Repository analysis, Interactive graph visualization, AI chat, Documentation generation

Test Requirements:
1. Use TypeScript with proper typing
2. Use data-cy or data-testid selectors (preferred over CSS classes)
3. Include proper setup with cy.mockSupabaseAuth() for authentication mocking
4. Add meaningful assertions
5. Follow AAA pattern (Arrange, Act, Assert)
6. Include comments explaining each step
7. Handle async operations properly

Available Custom Commands:
- cy.mockSupabaseAuth() - Mock Supabase authentication
- cy.login(email, password) - Login helper
- cy.waitForGraph() - Wait for Cytoscape graph to render
- cy.dataCy(value) - Get element by data-cy attribute
- cy.findByTestId(testId) - Get element by data-testid
- cy.generateTest(description) - Generate test with AI
- cy.measurePerformance(callback) - Measure performance
- cy.checkA11y() - Check accessibility

Generate a complete test file with describe and it blocks. Return ONLY the TypeScript code without markdown formatting.`;

  try {
    let response;

    if (AI_PROVIDER === 'groq') {
      response = await axios.post(
        'https://api.groq.com/openai/v1/chat/completions',
        {
          model: AI_MODEL,
          messages: [
            {
              role: 'system',
              content: 'You are an expert Cypress test automation engineer specializing in React applications. Generate high-quality, maintainable TypeScript test code.'
            },
            {
              role: 'user',
              content: prompt
            }
          ],
          temperature: 0.3,
          max_tokens: 2000,
        },
        {
          headers: {
            'Authorization': `Bearer ${AI_API_KEY}`,
            'Content-Type': 'application/json',
          },
        }
      );

      const testCode = response.data.choices[0]?.message?.content;
      await saveTestFile(testCode);
    } else if (AI_PROVIDER === 'gemini') {
      response = await axios.post(
        `https://generativelanguage.googleapis.com/v1beta/models/${AI_MODEL}:generateContent`,
        {
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: 0.3,
            maxOutputTokens: 2000,
          },
        },
        {
          headers: {
            'Content-Type': 'application/json',
            'x-goog-api-key': AI_API_KEY,
          },
        }
      );

      const testCode = response.data.candidates[0]?.content?.parts[0]?.text;
      await saveTestFile(testCode);
    } else {
      throw new Error(`Unsupported AI provider: ${AI_PROVIDER}`);
    }

  } catch (error) {
    console.error('❌ Error generating test:', error.message);
    if (error.response) {
      console.error('API Error:', error.response.data);
    }
    process.exit(1);
  }
}

async function saveTestFile(testCode) {
  // Clean up the code (remove markdown code blocks if present)
  let cleanCode = testCode;
  const codeBlockMatch = testCode.match(/```typescript?\n([\s\S]*?)```/);
  if (codeBlockMatch) {
    cleanCode = codeBlockMatch[1];
  }

  // Generate filename from feature description
  const timestamp = new Date().toISOString().split('T')[0];
  const sanitizedFeature = featureDescription
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .substring(0, 50);
  const filename = `ai-generated-${sanitizedFeature}-${timestamp}.cy.ts`;
  const filepath = path.join(__dirname, '..', 'cypress', 'e2e', filename);

  // Add header comment
  const finalCode = `// AI-Generated Test
// Feature: ${featureDescription}
// Generated: ${new Date().toISOString()}
// Model: ${AI_MODEL}
// Provider: ${AI_PROVIDER}

${cleanCode.trim()}
`;

  // Save file
  fs.writeFileSync(filepath, finalCode);
  
  console.log('✅ Test generated successfully!');
  console.log(`📁 File: cypress/e2e/${filename}`);
  console.log('');
  console.log('To run this test:');
  console.log(`  npm run cypress:open`);
  console.log('  # Then select the test file in Cypress UI');
  console.log('');
  console.log('Or run headlessly:');
  console.log(`  npx cypress run --spec "cypress/e2e/${filename}"`);
}

// Run the generator
generateTest();
