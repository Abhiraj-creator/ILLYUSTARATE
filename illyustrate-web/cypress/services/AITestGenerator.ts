import axios from 'axios'

export interface TestGenerationRequest {
  feature: string
  context?: string
  url?: string
  selectors?: Record<string, string>
}

export interface TestGenerationResponse {
  testCode: string
  description: string
  selectors: string[]
  assertions: string[]
}

export class AITestGenerator {
  private apiKey: string
  private provider: string
  private model: string

  constructor() {
    this.apiKey = Cypress.env('AI_API_KEY') || ''
    this.provider = Cypress.env('AI_PROVIDER') || 'groq'
    this.model = Cypress.env('AI_MODEL') || 'mixtral-8x7b-32768'
  }

  async generateTest(request: TestGenerationRequest): Promise<TestGenerationResponse> {
    if (!this.apiKey) {
      throw new Error('AI API key not configured')
    }

    const prompt = this.buildPrompt(request)
    
    try {
      const response = await this.callAI(prompt)
      return this.parseResponse(response, request)
    } catch (error) {
      console.error('AI Test Generation failed:', error)
      throw error
    }
  }

  async analyzeFailure(error: string, testCode: string): Promise<string> {
    const prompt = `Analyze this Cypress test failure and suggest fixes:

Test Code:
${testCode}

Error:
${error}

Provide a brief analysis and suggest specific fixes.`

    return this.callAI(prompt)
  }

  private buildPrompt(request: TestGenerationRequest): string {
    return `Generate a comprehensive Cypress E2E test for the following feature:

Feature: ${request.feature}
${request.context ? `Context: ${request.context}` : ''}
${request.url ? `URL: ${request.url}` : ''}

Requirements:
1. Use TypeScript
2. Follow Cypress best practices
3. Include proper selectors (prefer data-cy or data-testid attributes)
4. Add meaningful assertions
5. Handle async operations with proper waits
6. Include error handling
7. Add descriptive comments

Available Custom Commands:
- cy.login(email, password) - Login helper
- cy.mockSupabaseAuth() - Mock authentication
- cy.waitForGraph() - Wait for graph visualization
- cy.dataCy(value) - Get element by data-cy
- cy.findByTestId(testId) - Get element by data-testid

Generate the complete test code in this format:

describe('Feature Name', () => {
  beforeEach(() => {
    // Setup code
  })

  it('should do something', () => {
    // Test code
  })
})`
  }

  private async callAI(prompt: string): Promise<string> {
    if (this.provider === 'groq') {
      return this.callGroq(prompt)
    } else if (this.provider === 'gemini') {
      return this.callGemini(prompt)
    }
    throw new Error(`Unsupported AI provider: ${this.provider}`)
  }

  private async callGroq(prompt: string): Promise<string> {
    const response = await axios.post(
      'https://api.groq.com/openai/v1/chat/completions',
      {
        model: this.model,
        messages: [
          {
            role: 'system',
            content: 'You are an expert Cypress test automation engineer. Generate high-quality, maintainable test code.'
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
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
      }
    )

    return response.data.choices[0]?.message?.content || ''
  }

  private async callGemini(prompt: string): Promise<string> {
    const response = await axios.post(
      `https://generativelanguage.googleapis.com/v1beta/models/${this.model}:generateContent`,
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
          'x-goog-api-key': this.apiKey,
        },
      }
    )

    return response.data.candidates[0]?.content?.parts[0]?.text || ''
  }

  private parseResponse(response: string, request: TestGenerationRequest): TestGenerationResponse {
    // Extract test code from markdown code blocks if present
    const codeBlockMatch = response.match(/```typescript?\n([\s\S]*?)```/)
    const testCode = codeBlockMatch ? codeBlockMatch[1] : response

    // Extract selectors mentioned in the test
    const selectorMatches = testCode.match(/cy\.(get|find)\(['"`]([^'"`]+)['"`]/g) || []
    const selectors = selectorMatches.map(match => {
      const parts = match.match(/['"`]([^'"`]+)['"`]/)
      return parts ? parts[1] : ''
    }).filter(Boolean)

    // Extract assertions
    const assertionMatches = testCode.match(/\.(should|expect)\([^)]+\)/g) || []
    const assertions = assertionMatches.map(match => match.trim())

    return {
      testCode: testCode.trim(),
      description: request.feature,
      selectors: [...new Set(selectors)],
      assertions: [...new Set(assertions)],
    }
  }
}

export const aiTestGenerator = new AITestGenerator()
