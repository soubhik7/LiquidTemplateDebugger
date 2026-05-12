# AI-Powered Liquid Template Generation

## Overview

The Liquid Template Debugger now includes an AI-powered template generation feature that uses Google's Gemini API to automatically create Liquid templates based on sample input data and expected output.

## Features

### 🤖 Intelligent Template Generation
- Analyzes input data structure and expected output format
- Generates appropriate Liquid syntax with loops, conditionals, and filters
- Supports multiple complexity levels (basic, intermediate, advanced)
- Includes helpful comments explaining the logic

### 🔒 Security & Privacy First
- **Automatic Data Sanitization**: Detects and redacts sensitive information before sending to AI
- **Local API Key Storage**: Your Gemini API key is stored securely in your browser
- **User Confirmation**: Review what data will be sent before generation
- **No Data Retention**: Data is only used for the generation request and not stored

### 📊 Multi-Format Support
- **Input Formats**: JSON, XML, CSV, Text
- **Output Formats**: JSON, XML, CSV, Text
- **Format Transformations**: Generate templates that convert between different formats

### 📝 Business Logic Integration
- Optional business logic/mapping sheet input
- Helps AI understand complex transformation requirements
- Supports custom rules and constraints

## Setup

### 1. Get a Gemini API Key

1. Visit [Google AI Studio](https://makersuite.google.com/app/apikey)
2. Sign in with your Google account
3. Click "Create API Key"
4. Copy your API key

### 2. Configure in Settings

1. Open the Liquid Template Debugger
2. Navigate to **Settings** (gear icon in sidebar)
3. Scroll to **AI Template Generation** section
4. Paste your API key
5. Click **Validate API Key**
6. Enable AI features with the toggle

### 3. Select AI Model

Choose from available Gemini models:
- **Gemini 1.5 Flash**: Fast and efficient (recommended for most use cases)
- **Gemini 1.5 Pro**: Most capable, best for complex templates
- **Gemini Pro**: Balanced performance

## Usage

### Basic Template Generation

1. Click the **Generate Template** button (✨ icon) in the header bar
2. In the modal, provide:
   - **Input Data**: Sample data in JSON, XML, CSV, or text format
   - **Expected Output**: The desired output structure
   - **Business Logic** (optional): Additional context or rules
3. Select complexity level and options
4. Review the privacy panel showing what will be sent
5. Click **Generate Template**
6. Preview the generated template
7. Accept to load it into the debugger or regenerate if needed

### Example: JSON to XML Transformation

**Input Data (JSON):**
```json
{
  "order": {
    "id": "12345",
    "customer": "John Doe",
    "items": [
      { "name": "Widget", "quantity": 2, "price": 10.00 },
      { "name": "Gadget", "quantity": 1, "price": 25.00 }
    ],
    "total": 45.00
  }
}
```

**Expected Output (XML):**
```xml
<Order>
  <OrderId>12345</OrderId>
  <CustomerName>John Doe</CustomerName>
  <Items>
    <Item>
      <Name>Widget</Name>
      <Quantity>2</Quantity>
      <Price>10.00</Price>
    </Item>
    <Item>
      <Name>Gadget</Name>
      <Quantity>1</Quantity>
      <Price>25.00</Price>
    </Item>
  </Items>
  <TotalAmount>45.00</TotalAmount>
</Order>
```

**Generated Template:**
```liquid
{% comment %}
  Transform JSON order data to XML format
  Input: order object with id, customer, items array, and total
  Output: XML structure with Order root element
{% endcomment %}

<Order>
  <OrderId>{{ order.id }}</OrderId>
  <CustomerName>{{ order.customer }}</CustomerName>
  <Items>
    {% for item in order.items %}
    <Item>
      <Name>{{ item.name }}</Name>
      <Quantity>{{ item.quantity }}</Quantity>
      <Price>{{ item.price }}</Price>
    </Item>
    {% endfor %}
  </Items>
  <TotalAmount>{{ order.total }}</TotalAmount>
</Order>
```

### Using Business Logic

For complex transformations, provide business logic to guide the AI:

**Business Logic Example:**
```
- Convert all customer names to uppercase
- Calculate line total for each item (quantity * price)
- Add a discount field if total > 100
- Format prices with 2 decimal places
- Include order date in ISO 8601 format
```

The AI will incorporate these rules into the generated template.

## Security Features

### Automatic Data Sanitization

The system automatically detects and redacts:
- Email addresses
- Phone numbers
- Credit card numbers
- Social Security Numbers
- API keys and tokens
- Bearer tokens
- Long alphanumeric strings (potential secrets)
- Fields with sensitive keywords (password, secret, token, etc.)

### Sanitization Process

1. **Detection**: Regex patterns scan for sensitive data
2. **Redaction**: Sensitive values replaced with `[REDACTED]`
3. **User Review**: Privacy panel shows what was sanitized
4. **Confirmation**: User must confirm before sending to AI

### Custom Sensitive Patterns

Add custom patterns in `appsettings.json`:

```json
{
  "AI": {
    "SensitivePatterns": [
      "\\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\\.[A-Z|a-z]{2,}\\b",
      "\\bYOUR_CUSTOM_PATTERN\\b"
    ]
  }
}
```

## API Endpoints

### Generate Template
```http
POST /api/ai/generate-template
Content-Type: application/json

{
  "inputData": "{ ... }",
  "expectedOutput": "{ ... }",
  "businessLogic": "optional rules",
  "inputFormat": "json",
  "outputFormat": "xml",
  "options": {
    "complexity": "intermediate",
    "includeComments": true,
    "sensitiveFieldPatterns": [],
    "model": "gemini-1.5-flash",
    "maxTokens": 8000,
    "temperature": 0.7
  }
}
```

### Validate API Key
```http
POST /api/ai/validate-key
Content-Type: application/json

{
  "apiKey": "your-api-key"
}
```

### Get Available Models
```http
GET /api/ai/models
```

### Check AI Status
```http
GET /api/ai/status
```

## Configuration

### appsettings.json

```json
{
  "AI": {
    "Enabled": false,
    "ApiKey": null,
    "DefaultModel": "gemini-1.5-flash",
    "SensitivePatterns": [
      "\\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\\.[A-Z|a-z]{2,}\\b",
      "\\b\\d{3}[-.]?\\d{3}[-.]?\\d{4}\\b",
      "\\b\\d{4}[-\\s]?\\d{4}[-\\s]?\\d{4}[-\\s]?\\d{4}\\b"
    ],
    "MaxRetries": 3,
    "TimeoutSeconds": 30
  }
}
```

### Environment Variables

```bash
# Override API key via environment variable
AI__ApiKey=your-api-key-here
AI__Enabled=true
AI__DefaultModel=gemini-1.5-pro
```

## Best Practices

### 1. Start Simple
- Begin with basic templates and gradually increase complexity
- Test generated templates with the debugger before using in production

### 2. Provide Clear Examples
- Use representative sample data
- Ensure expected output matches your actual requirements
- Include edge cases in your examples

### 3. Use Business Logic
- Describe transformation rules clearly
- Specify data type conversions
- Mention any special formatting requirements

### 4. Review Generated Templates
- Always review and test generated templates
- Verify that sensitive data handling is correct
- Check for edge cases and error handling

### 5. Iterate
- If the first generation isn't perfect, regenerate with more context
- Adjust complexity level based on your needs
- Provide additional business logic for better results

## Troubleshooting

### API Key Validation Fails
- Verify your API key is correct
- Check that you have internet connectivity
- Ensure the Gemini API is accessible from your network
- Try generating a new API key

### Generated Template Doesn't Work
- Check that input data format matches what you provided
- Verify the template syntax in the debugger
- Try regenerating with more specific business logic
- Adjust complexity level

### Sensitive Data Not Detected
- Add custom patterns in settings
- Review the sanitization rules
- Contact support if critical data is not being redacted

### Generation Takes Too Long
- Try using Gemini 1.5 Flash for faster results
- Reduce the complexity level
- Simplify your input/output examples
- Check your network connection

## Limitations

- **AI Accuracy**: Generated templates may require manual adjustments
- **Complex Logic**: Very complex business rules may not be fully captured
- **Rate Limits**: Subject to Gemini API rate limits
- **Internet Required**: Requires active internet connection
- **Language Support**: Best results with English descriptions

## Privacy Policy

### Data Handling
- Input data is sanitized before being sent to Google's Gemini API
- API keys are stored locally in browser storage
- No data is retained after the generation request completes
- Google's privacy policy applies to data sent to Gemini API

### User Responsibilities
- Review sanitized data before confirming generation
- Do not include highly sensitive or confidential data
- Use appropriate security measures for API key storage
- Comply with your organization's data handling policies

## Support

For issues, questions, or feature requests:
- GitHub Issues: [LiquidTemplateDebugger/issues](https://github.com/soubhik7/LiquidTemplateDebugger/issues)
- Documentation: [docs/](../docs/)
- Email: support@example.com

## License

This feature is part of the Liquid Template Debugger and is subject to the same license terms.

---

**Version**: 1.2.0  
**Last Updated**: 2026-05-12  
**Author**: Liquid Template Debugger Team