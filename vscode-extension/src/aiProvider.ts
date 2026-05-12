import * as vscode from 'vscode';

export interface AIValidationResult {
  isValid: boolean;
  errorMessage?: string;
}

export class AIProvider {
  private static readonly GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models?key=';

  public async validateKey(apiKey: string): Promise<AIValidationResult> {
    if (!apiKey) {
      return { isValid: false, errorMessage: 'API key is empty' };
    }

    try {
      // Use built-in fetch (available in Node 18+)
      const response = await fetch(`${AIProvider.GEMINI_API_URL}${apiKey}`);
      
      if (response.ok) {
        return { isValid: true };
      } else {
        const errorData = await response.json() as any;
        const message = errorData?.error?.message || `HTTP ${response.status}: ${response.statusText}`;
        return { isValid: false, errorMessage: message };
      }
    } catch (err: any) {
      return { isValid: false, errorMessage: err.message || String(err) };
    }
  }

  public async generateTemplate(prompt: string, apiKey: string, model: string = 'gemini-3.1-flash-lite'): Promise<string> {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
    
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
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody)
      });

      if (!response.ok) {
        const errorData = await response.json() as any;
        throw new Error(errorData?.error?.message || `AI Generation failed (HTTP ${response.status})`);
      }

      const result = await response.json() as any;
      const text = result?.candidates?.[0]?.content?.parts?.[0]?.text;
      
      if (!text) {
        throw new Error('AI returned an empty response');
      }

      // Clean up the response (remove markdown code blocks if present)
      return text.replace(/```liquid\n?|```\n?/g, '').trim();
    } catch (err: any) {
      throw new Error(`AI Template Generation failed: ${err.message}`);
    }
  }

  public async listModels(apiKey: string): Promise<string[]> {
    if (!apiKey) return [];

    try {
      const response = await fetch(`${AIProvider.GEMINI_API_URL}${apiKey}`);
      if (!response.ok) return [];

      const data = await response.json() as any;
      const models = data?.models || [];
      
      // Filter models that support generateContent and are currently active
      return models
        .filter((m: any) => m.supportedGenerationMethods?.includes('generateContent'))
        .map((m: any) => m.name.replace('models/', ''));
    } catch (err) {
      console.error('Failed to list models:', err);
      return [];
    }
  }
}
