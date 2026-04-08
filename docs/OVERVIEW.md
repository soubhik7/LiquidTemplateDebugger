# Liquid Template Debugger - Overview

## What is it?

The Liquid Template Debugger is a development tool that helps you understand and troubleshoot Liquid templates. Think of it as a "step-through debugger" for your templates - similar to how you would debug regular code, but specifically designed for Liquid template transformations.

## Why use it?

When working with Liquid templates, especially complex ones that transform data between different formats, it can be difficult to understand:

- **Where did this value come from?** - Track data from its original source through all transformations
- **Why isn't my template working?** - See exactly what happens at each step of execution
- **What's the current state?** - Inspect all variables and their values at any point
- **How is my data being transformed?** - Watch data change as it flows through filters and logic

## Key Capabilities

### 🔍 Step-by-Step Execution
Execute your template one line at a time, seeing exactly what happens at each step. Pause execution at any point to inspect the current state.

### 📊 Variable Inspection
View all variables, their current values, and where they came from. Understand the complete data structure at any point in your template's execution.

### 🎯 Breakpoints & Watches
Set breakpoints to pause execution at specific lines. Create watch expressions to monitor values that matter to you as the template executes.

### 🔄 Format Transformations
Work with data in multiple formats:
- **JSON** - Standard web data format
- **XML** - Enterprise and legacy system format
- **CSV** - Spreadsheet and tabular data
- **Text** - Key-value pairs and custom formats

Convert between any of these formats seamlessly.

### 📍 Data Origin Tracking
Every value knows where it came from - whether it's from your input data, created by the template, or the result of a transformation. This makes it easy to trace issues back to their source.

## How it Works

### 1. Load Your Template and Data
Provide your Liquid template and input data (in any supported format). The debugger parses both and prepares them for step-by-step execution.

### 2. Step Through Execution
Execute your template one element at a time:
- See what each line produces
- Watch variables change
- Understand control flow (loops, conditions)
- Track data transformations

### 3. Inspect and Analyze
At any point, you can:
- View all current variables
- Inspect specific values in detail
- See the output generated so far
- Trace where values originated
- Evaluate custom expressions

### 4. Debug Issues
When something isn't working:
- Set breakpoints at problem areas
- Watch specific expressions
- Step through the problematic section
- See exactly what values are being used
- Understand why conditions evaluate the way they do

## Use Cases

### Template Development
Build and test templates incrementally. See the results of each change immediately without running the full template.

### Troubleshooting
When a template produces unexpected output, step through it to find exactly where things go wrong.

### Learning
Understand how Liquid templates work by watching them execute step-by-step. See how filters transform data, how loops iterate, and how conditions evaluate.

### Data Format Conversion
Transform data between JSON, XML, CSV, and text formats. Validate that your transformations produce the correct output structure.

### Azure Logic Apps Integration
Test templates that will be used in Azure Logic Apps, with full support for the Logic Apps data wrapping pattern.

## Getting Started

### Prerequisites
- A modern web browser (Chrome, Firefox, Edge, Safari)
- .NET 9 SDK (for running the server)

### Quick Start
1. Start the debugger server
2. Open your browser to the provided URL
3. Load your template and data files
4. Begin stepping through execution

### Sample Templates
The debugger includes sample templates demonstrating:
- Basic variable output
- Loops and iteration
- Conditional logic
- Format transformations
- Complex nested structures

## Key Features Explained

### Breakpoints
Pause execution at specific lines to inspect state. Optionally add conditions so the breakpoint only triggers when certain criteria are met.

### Watch Expressions
Monitor specific values or expressions as you step through the template. Get notified when watched values change.

### Variable Scoping
Understand which variables are available at each point in your template. See how loop variables and assignments affect scope.

### Output Mapping
Know which template lines produced which parts of the output. Click on output to jump to the source line that generated it.

### Format Validation
Verify that your output is valid JSON, XML, or CSV. Get clear error messages pointing to the source line if validation fails.

## Architecture Highlights

The debugger is built with:
- **Modular design** - Clean separation between parsing, execution, and presentation
- **Web-based interface** - Access from any browser, no installation required
- **REST API** - All functionality available via HTTP endpoints
- **Extensible format support** - Easy to add new input/output formats

## Security & Best Practices

The debugger is designed for **local development use**:
- Runs on your local machine
- Processes data locally
- No data sent to external services
- Suitable for sensitive or proprietary templates and data

## What's Next?

Once you're comfortable with basic debugging:
- Explore format transformation capabilities
- Try conditional breakpoints for complex scenarios
- Use watch expressions to monitor calculations
- Experiment with different input formats
- Test templates that will be deployed to production systems

## Support & Documentation

For detailed information:
- **User Guide** - Step-by-step instructions for all features
- **Format Transformations** - Examples of converting between formats
- **API Reference** - Complete REST API documentation
- **Sample Templates** - Working examples to learn from

---

**Note**: This is a development tool designed to help you build and debug Liquid templates. It's not intended for production use or as a template rendering engine - use it to develop and test, then deploy your templates to your production environment.