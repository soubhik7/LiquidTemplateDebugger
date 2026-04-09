import { XMLParser, XMLBuilder } from 'fast-xml-parser';
import { parse as csvParse } from 'csv-parse/sync';
import { stringify as csvStringify } from 'csv-stringify/sync';

export class FormatConverter {
    private xmlParser: XMLParser;
    private xmlBuilder: XMLBuilder;

    constructor() {
        this.xmlParser = new XMLParser({
            ignoreAttributes: false,
            attributeNamePrefix: '@_',
            textNodeName: '#text',
            parseAttributeValue: true,
            parseTagValue: true
        });

        this.xmlBuilder = new XMLBuilder({
            ignoreAttributes: false,
            attributeNamePrefix: '@_',
            textNodeName: '#text',
            format: true,
            indentBy: '  '
        });
    }

    loadData(content: string, format: string): any {
        switch (format.toLowerCase()) {
            case 'json':
                return this.parseJson(content);
            case 'xml':
                return this.parseXml(content);
            case 'csv':
                return this.parseCsv(content);
            case 'text':
                return this.parseText(content);
            default:
                throw new Error(`Unsupported format: ${format}`);
        }
    }

    private parseJson(content: string): any {
        try {
            return JSON.parse(content);
        } catch (error) {
            throw new Error(`Invalid JSON: ${error}`);
        }
    }

    private parseXml(content: string): any {
        try {
            return this.xmlParser.parse(content);
        } catch (error) {
            throw new Error(`Invalid XML: ${error}`);
        }
    }

    private parseCsv(content: string): any {
        try {
            const records = csvParse(content, {
                columns: true,
                skip_empty_lines: true,
                trim: true,
                cast: true
            });
            return { rows: records };
        } catch (error) {
            throw new Error(`Invalid CSV: ${error}`);
        }
    }

    private parseText(content: string): any {
        const lines = content.split('\n');
        const data: any = {};

        for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed || trimmed.startsWith('#')) {
                continue;
            }

            const equalIndex = trimmed.indexOf('=');
            if (equalIndex > 0) {
                const key = trimmed.substring(0, equalIndex).trim();
                const value = trimmed.substring(equalIndex + 1).trim();
                data[key] = this.parseValue(value);
            }
        }

        return data;
    }

    private parseValue(value: string): any {
        if (value === 'true') return true;
        if (value === 'false') return false;
        if (value === 'null') return null;
        
        const num = Number(value);
        if (!isNaN(num) && value !== '') {
            return num;
        }

        if ((value.startsWith('"') && value.endsWith('"')) ||
            (value.startsWith("'") && value.endsWith("'"))) {
            return value.slice(1, -1);
        }

        return value;
    }

    convertToJson(data: any): string {
        return JSON.stringify(data, null, 2);
    }

    convertToXml(data: any): string {
        return this.xmlBuilder.build(data);
    }

    convertToCsv(data: any): string {
        if (Array.isArray(data)) {
            return csvStringify(data, { header: true });
        } else if (data.rows && Array.isArray(data.rows)) {
            return csvStringify(data.rows, { header: true });
        } else {
            const records = [data];
            return csvStringify(records, { header: true });
        }
    }

    validateOutput(output: string, format: string): { valid: boolean; error?: string } {
        try {
            switch (format.toLowerCase()) {
                case 'json':
                    JSON.parse(output);
                    return { valid: true };
                case 'xml':
                    this.xmlParser.parse(output);
                    return { valid: true };
                case 'csv':
                    csvParse(output, { columns: true });
                    return { valid: true };
                default:
                    return { valid: true };
            }
        } catch (error: any) {
            return { valid: false, error: error.message };
        }
    }

    wrapForLogicApps(data: any): any {
        return { content: data };
    }
}

// Made with Bob
