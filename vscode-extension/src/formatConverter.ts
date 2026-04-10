import { XMLParser } from 'fast-xml-parser';
import { parse as csvParse } from 'csv-parse/sync';

export class FormatConverter {
    private xmlParser: XMLParser;

    constructor() {
        this.xmlParser = new XMLParser({
            ignoreAttributes: false,
            attributeNamePrefix: 'attr_',
            textNodeName: 'value',
            parseAttributeValue: true,
            parseTagValue: true
        });
    }

    loadData(content: string, format: string): any {
        switch (format.toLowerCase()) {
            case 'json':  return this.parseJson(content);
            case 'xml':   return this.parseXml(content);
            case 'csv':   return this.parseCsv(content);
            case 'text':  return this.parseText(content);
            default:      throw new Error(`Unsupported format: ${format}`);
        }
    }

    /** Wrap raw data under { content: ... } so templates can use {{ content.foo }} */
    wrapForTemplate(data: any): any {
        // If the data already has a top-level "content" key, use as-is
        if (data && typeof data === 'object' && 'content' in data) {
            return data;
        }
        return { content: data };
    }

    private parseJson(content: string): any {
        try {
            return JSON.parse(content);
        } catch (e: any) {
            throw new Error(`Invalid JSON: ${e.message}`);
        }
    }

    private parseXml(content: string): any {
        try {
            return this.xmlParser.parse(content);
        } catch (e: any) {
            throw new Error(`Invalid XML: ${e.message}`);
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
        } catch (e: any) {
            throw new Error(`Invalid CSV: ${e.message}`);
        }
    }

    private parseText(content: string): any {
        const data: any = {};
        for (const line of content.split('\n')) {
            const trimmed = line.trim();
            if (!trimmed || trimmed.startsWith('#')) { continue; }
            const eq = trimmed.indexOf('=');
            if (eq > 0) {
                const key = trimmed.substring(0, eq).trim();
                const val = trimmed.substring(eq + 1).trim();
                data[key] = this.coerce(val);
            }
        }
        return data;
    }

    private coerce(value: string): any {
        if (value === 'true')  { return true; }
        if (value === 'false') { return false; }
        if (value === 'null')  { return null; }
        const n = Number(value);
        if (!isNaN(n) && value !== '') { return n; }
        if ((value.startsWith('"') && value.endsWith('"')) ||
            (value.startsWith("'") && value.endsWith("'"))) {
            return value.slice(1, -1);
        }
        return value;
    }
}
