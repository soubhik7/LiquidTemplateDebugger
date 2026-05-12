// Types for AI Template Generation

export interface GenerationOptions {
  complexity: 'basic' | 'intermediate' | 'advanced';
  includeComments: boolean;
  sensitiveFieldPatterns: string[];
  model: string;
  maxTokens: number;
  temperature: number;
}

export interface GenerateTemplateRequest {
  inputData: string;
  expectedOutput: string;
  businessLogic?: string;
  inputFormat: 'json' | 'xml' | 'csv' | 'text';
  outputFormat: 'json' | 'xml' | 'csv' | 'text';
  options: GenerationOptions;
}

export interface GenerationMetadata {
  tokensUsed: number;
  generationTimeMs: number;
  modelUsed: string;
  sanitizedFields: string[];
  dataWasSanitized: boolean;
}

export interface GenerateTemplateResponse {
  success: boolean;
  generatedTemplate?: string;
  errorMessage?: string;
  warnings: string[];
  metadata: GenerationMetadata;
}

export interface AIConfiguration {
  enabled: boolean;
  apiKey?: string;
  defaultModel: string;
  sensitivePatterns: string[];
  maxRetries: number;
  timeoutSeconds: number;
}

export interface ValidateApiKeyResponse {
  isValid: boolean;
  errorMessage?: string;
}

export interface GetModelsResponse {
  models: string[];
}

export interface AIStatus {
  configured: boolean;
}

// Made with Bob
