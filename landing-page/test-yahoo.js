
const yahooFinance = require('yahoo-finance2').default;

async function test() {
    try {
        console.log('Fetching data for AEM.TO...');
        const result = await yahooFinance.quote('AEM.TO');
        console.log('Result:', result);
    } catch (e) {
        console.error('Error:', e);
    }
}

test();
