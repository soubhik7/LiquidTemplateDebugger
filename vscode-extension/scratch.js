const { Liquid } = require('liquidjs');
const engine = new Liquid();
console.log(typeof engine.filters);
console.log(Object.keys(engine.filters));
// let's try to patch get() or impls
if (engine.filters.impls) {
    console.log(Object.keys(engine.filters.impls));
}
