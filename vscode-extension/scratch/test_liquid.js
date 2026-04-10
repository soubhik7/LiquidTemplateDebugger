const { Liquid } = require('liquidjs');
const engine = new Liquid();

async function test() {
    const context = {
        item: {
            price: {
                "#text": "299.99",
                "@currency": "USD"
            }
        }
    };
    try {
        const r1 = await engine.parseAndRender('{{ item.price["#text"] }}', context);
        console.log('Bracket access #text:', r1);
        const r2 = await engine.parseAndRender('{{ item.price.#text }}', context);
        console.log('Dot access #text:', r2);
    } catch (e) {
        console.error('Error:', e.message);
    }

    try {
        const r3 = await engine.parseAndRender('{{ item.price["@currency"] }}', context);
        console.log('Bracket access @currency:', r3);
        const r4 = await engine.parseAndRender('{{ item.price.@currency }}', context);
        console.log('Dot access @currency:', r4);
    } catch (e) {
        console.error('Error:', e.message);
    }
}

test();
