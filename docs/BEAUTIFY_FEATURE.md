# Beautify Feature Documentation

## Overview
Added beautify/format functionality for both input and output data in the Liquid Template Debugger. This feature allows users to format JSON, XML, and CSV data for better readability.

## Features Added

### 1. UI Components
- **Input Panel**: Added "✨ Beautify" button next to the Edit button
- **Output Panel**: Added "✨ Beautify" button in the toolbar

### 2. Client-Side Implementation (JavaScript)

#### Functions Added:
- `beautifyInput()` - Formats the input data based on detected format
- `beautifyOutput()` - Formats the output data with auto-detection
- `detectOutputFormat()` - Auto-detects format (JSON, XML, CSV, or text)
- `beautifyContent()` - Routes to appropriate formatter
- `beautifyJSON()` - Formats JSON with 2-space indentation
- `beautifyXML()` - Formats XML with proper indentation and structure
- `beautifyCSV()` - Formats CSV with consistent spacing and alignment
- `formatXMLNode()` - Recursive XML node formatter
- `parseCSVLine()` - CSV parser handling quoted fields
- `escapeCSVCell()` - Properly escapes CSV cells

#### Format Detection:
The system automatically detects the format of output data:
- **JSON**: Starts with `{` or `[` and is valid JSON
- **XML**: Starts with `<` and contains XML tags
- **CSV**: Contains commas and multiple lines
- **Text**: Default fallback

### 3. Server-Side Implementation (C#)

#### API Endpoint:
```
POST /api/beautify
```

**Request Body:**
```json
{
  "content": "string",
  "format": "json|xml|csv|text"
}
```

**Response:**
```json
{
  "content": "formatted string",
  "format": "json"
}
```

#### Backend Functions:
- `BeautifyJson()` - Uses Newtonsoft.Json for formatting
- `BeautifyXml()` - Uses System.Xml.Linq for formatting
- `BeautifyCsv()` - Custom CSV formatter with consistent spacing
- `ParseCsvLine()` - Helper for CSV parsing

### 4. Files Modified

1. **wwwroot/index.html**
   - Added beautify buttons to Input and Output panels (lines 308, 330)
   - Added JavaScript beautify functions (lines 957-1165)

2. **Api/DebugApiEndpoints.cs**
   - Added using statements for System.Text, System.Xml.Linq, Newtonsoft.Json
   - Added `/api/beautify` endpoint (lines 318-426)
   - Added helper methods for formatting

3. **Api/Dtos.cs**
   - Added `BeautifyRequest` record (lines 159-162)

## Usage

### Beautifying Input Data:
1. Load or edit input data in the Input Data panel
2. Click the "✨ Beautify" button
3. The data will be formatted according to its detected format (JSON, XML, CSV)

### Beautifying Output Data:
1. Step through template execution to generate output
2. Click the "✨ Beautify" button in the Output panel
3. The output will be auto-detected and formatted appropriately

## Supported Formats

### JSON
- Indentation: 2 spaces
- Validates JSON structure before formatting
- Handles nested objects and arrays

### XML
- Proper indentation with 2 spaces per level
- Self-closing tags for empty elements
- Preserves attributes
- Handles text content appropriately

### CSV
- Consistent spacing after commas
- Column alignment (except last column)
- Proper quote escaping for cells containing commas, quotes, or newlines
- Handles multi-line cells

## Error Handling
- Invalid format errors are displayed as toast notifications
- Empty content is handled gracefully
- Format detection failures fall back to text format

## Benefits
1. **Improved Readability**: Makes data easier to read and understand
2. **Debugging Aid**: Helps identify structure issues in output
3. **Format Validation**: Validates data structure during beautification
4. **User Experience**: One-click formatting without external tools

## Technical Notes
- Client-side formatting is preferred for performance
- Server-side endpoint available for consistency and advanced scenarios
- Format detection is automatic for output, explicit for input
- All formatters handle edge cases (empty data, special characters, etc.)