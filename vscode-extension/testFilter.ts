import { Liquid } from 'liquidjs';
const engine = new Liquid();
const filters = (engine as any).filters;
console.log(filters ? Object.keys(filters) : "no filters");
if (filters && filters.impls) console.log(Object.keys(filters.impls));
