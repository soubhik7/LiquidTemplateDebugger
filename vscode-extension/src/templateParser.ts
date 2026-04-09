import { Liquid, Tokenizer, TagToken, OutputToken } from 'liquidjs';
import { ParsedTemplate, TemplateElement } from './types';
import * as fs from 'fs';

export class TemplateParser {
    private liquid: Liquid;

    constructor() {
        this.liquid = new Liquid({
            strictFilters: false,
            strictVariables: false,
            lenientIf: true
        });
    }

    async parseTemplate(templatePath: string): Promise<ParsedTemplate> {
        const content = fs.readFileSync(templatePath, 'utf-8');
        const lines = content.split('\n');
        const elements: TemplateElement[] = [];

        try {
            const tokens = this.liquid.parse(content);
            let currentLine = 1;
            let currentPos = 0;

            for (const token of tokens) {
                const tokenContent = content.substring(currentPos, token.end);
                const tokenLines = tokenContent.split('\n');
                
                if (token.kind === 1) { // Output token
                    const outputToken = token as OutputToken;
                    elements.push({
                        type: 'output',
                        line: currentLine,
                        content: outputToken.content,
                        raw: tokenContent
                    });
                } else if (token.kind === 2) { // Tag token
                    const tagToken = token as TagToken;
                    elements.push({
                        type: 'tag',
                        line: currentLine,
                        content: tagToken.name,
                        raw: tokenContent
                    });
                } else {
                    // Literal/HTML content
                    if (tokenContent.trim()) {
                        elements.push({
                            type: 'literal',
                            line: currentLine,
                            content: tokenContent,
                            raw: tokenContent
                        });
                    }
                }

                currentLine += tokenLines.length - 1;
                currentPos = token.end;
            }

            return {
                elements,
                lines,
                totalLines: lines.length
            };
        } catch (error: any) {
            throw new Error(`Template parsing error: ${error.message}`);
        }
    }

    async renderTemplate(templatePath: string, data: any): Promise<string> {
        const content = fs.readFileSync(templatePath, 'utf-8');
        try {
            return await this.liquid.parseAndRender(content, data);
        } catch (error: any) {
            throw new Error(`Template rendering error: ${error.message}`);
        }
    }

    async evaluateExpression(expression: string, context: any): Promise<any> {
        try {
            const template = `{{ ${expression} }}`;
            const result = await this.liquid.parseAndRender(template, context);
            return this.parseValue(result);
        } catch (error: any) {
            throw new Error(`Expression evaluation error: ${error.message}`);
        }
    }

    private parseValue(value: string): any {
        const trimmed = value.trim();
        
        if (trimmed === 'true') return true;
        if (trimmed === 'false') return false;
        if (trimmed === 'null' || trimmed === '') return null;
        
        const num = Number(trimmed);
        if (!isNaN(num)) {
            return num;
        }
        
        return trimmed;
    }

    getLineContent(lines: string[], lineNumber: number): string {
        if (lineNumber < 1 || lineNumber > lines.length) {
            return '';
        }
        return lines[lineNumber - 1];
    }

    getContextLines(lines: string[], currentLine: number, contextSize: number = 2): string[] {
        const start = Math.max(0, currentLine - contextSize - 1);
        const end = Math.min(lines.length, currentLine + contextSize);
        return lines.slice(start, end);
    }
}

// Made with Bob
