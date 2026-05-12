export interface AISample {
  name: string;
  prompt: string;
  data: string;
  format: 'json' | 'xml' | 'text';
}

export const AI_SAMPLES: AISample[] = [
  {
    name: 'Order Summary',
    prompt: 'Using the content. prefix for root variables, create an order summary that calculates the total price by multiplying quantity and unit price, and includes a formatted customer name.',
    format: 'json',
    data: `{
  "orderId": "ORD-123",
  "customer": {
    "firstName": "John",
    "lastName": "Doe"
  },
  "item": {
    "name": "Wireless Mouse",
    "price": 25.99,
    "quantity": 2
  }
}`
  },
  {
    name: 'Conditional Greeting',
    prompt: 'Using the content. prefix, generate a personalized greeting based on the user role. If admin, show a special welcome message, otherwise show a standard one.',
    format: 'json',
    data: `{
  "user": {
    "name": "Sarah Connor",
    "role": "admin",
    "lastLogin": "2024-05-12"
  }
}`
  },
  {
    name: 'XML Batch Export',
    prompt: 'Using content. prefix, transform a list of products into an XML batch format with attributes for ID and category, and a nested element for the price.',
    format: 'json',
    data: `{
  "batchId": "B-99",
  "products": [
    { "id": 1, "name": "Laptop", "price": 1200, "cat": "Electronics" },
    { "id": 2, "name": "Coffee", "price": 15, "cat": "Food" }
  ]
}`
  },
  {
    name: 'CSV List Flattening',
    prompt: 'Using content. prefix, extract items from a nested JSON structure and flatten them into a CSV format with headers for Name and Category.',
    format: 'json',
    data: `{
  "warehouse": "Primary",
  "inventory": [
    { "product": { "title": "Desk Lamp", "type": "Decor" } },
    { "product": { "title": "Chair", "type": "Furniture" } }
  ]
}`
  },
  {
    name: 'Data Cleanup',
    prompt: 'Using content. prefix, clean up dirty input data by stripping whitespace, converting emails to lowercase, and formatting dates to YYYY-MM-DD.',
    format: 'json',
    data: `{
  "rawUser": {
    "fullName": "  Soubhik Mukherjee  ",
    "email": "SOUBHIK@Example.Com",
    "regDate": "05/12/2024"
  }
}`
  }
];
