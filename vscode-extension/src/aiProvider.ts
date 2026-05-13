import * as vscode from 'vscode';

export interface AIValidationResult {
  isValid: boolean;
  errorMessage?: string;
}

export class AIProvider {
  private static readonly GEMINI_BASE_URL = 'https://generativelanguage.googleapis.com/v1beta/models';

  public async validateKey(apiKey: string): Promise<AIValidationResult> {
    if (!apiKey) {
      return { isValid: false, errorMessage: 'API key is empty' };
    }

    try {
      // Use built-in fetch (available in Node 18+)
      const response = await fetch(AIProvider.GEMINI_BASE_URL, {
        headers: { 'x-goog-api-key': apiKey }
      });
      
      if (response.ok) {
        return { isValid: true };
      } else {
        const errorData = await response.json() as any;
        // Sanitize error message (don't leak internal details)
        const rawMessage = errorData?.error?.message || '';
        const message = this.sanitizeErrorMessage(rawMessage) || `HTTP ${response.status}`;
        return { isValid: false, errorMessage: message };
      }
    } catch (err: any) {
      return { isValid: false, errorMessage: 'Connection failed' };
    }
  }

  private static readonly MODEL_PATTERN = /^[a-zA-Z0-9][a-zA-Z0-9._-]{0,99}$/;

  public async generateTemplate(prompt: string, apiKey: string, model: string = 'gemini-3.1-flash-lite'): Promise<string> {
    if (!AIProvider.MODEL_PATTERN.test(model)) {
      throw new Error('Invalid model identifier');
    }
    const url = `${AIProvider.GEMINI_BASE_URL}/${encodeURIComponent(model)}:generateContent`;
    
    const requestBody = {
      contents: [{
        parts: [{
          text: prompt
        }]
      }],
      generationConfig: {
        temperature: 0.2,
        topK: 40,
        topP: 0.95,
        maxOutputTokens: 2048,
      }
    };

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'x-goog-api-key': apiKey
        },
        body: JSON.stringify(requestBody)
      });

      if (!response.ok) {
        const errorData = await response.json() as any;
        const rawMessage = errorData?.error?.message || '';
        throw new Error(this.sanitizeErrorMessage(rawMessage) || `HTTP ${response.status}`);
      }

      const result = await response.json() as any;
      const text = result?.candidates?.[0]?.content?.parts?.[0]?.text;
      
      if (!text) {
        throw new Error('AI returned an empty response');
      }

      // Clean up the response (remove markdown code blocks if present)
      return text.replace(/```liquid\n?|```\n?/g, '').trim();
    } catch (err: any) {
      throw new Error(`AI Generation failed: ${err.message}`);
    }
  }

  public async listModels(apiKey: string): Promise<string[]> {
    if (!apiKey) return [];

    try {
      const response = await fetch(AIProvider.GEMINI_BASE_URL, {
        headers: { 'x-goog-api-key': apiKey }
      });
      if (!response.ok) return [];

      const data = await response.json() as any;
      const models = data?.models || [];
      
      // Filter models that support generateContent and are currently active
      return models
        .filter((m: any) => m.supportedGenerationMethods?.includes('generateContent'))
        .map((m: any) => m.name.replace('models/', ''));
    } catch (err) {
      // Structured logging without leaking sensitive data
      console.error('AI listModels failed');
      return [];
    }
  }

  private sanitizeErrorMessage(message: string): string {
    if (!message) return '';
    // Remove specific technical details like model names, account IDs, etc. if they appear in common patterns
    return message
      .replace(/models\/[a-zA-Z0-9-._]+/g, 'model')
      .replace(/[a-f0-9]{24,}/gi, 'ID')
      .trim();
  }
}
