const fs = require('fs');
const path = require('path');

// Fallback to Yahoo Finance if local data is unavailable or stale
let yahooFinance;
try {
    const YahooFinanceClass = require('yahoo-finance2').default;
    yahooFinance = new YahooFinanceClass();
} catch (e) {
    console.warn('yahoo-finance2 not available, will use local data only');
}

// Map of Display Name to Yahoo Ticker (used as fallback)
const TICKERS = {
    'Agnico Eagle': 'AEM.TO',
    'Barrick Gold': 'ABX.TO',
    'Wheaton PM': 'WPM.TO',
    'Cameco': 'CCO.TO',
    'Franco-Nevada': 'FNV.TO',
    'Kinross': 'K.TO',
    'Nutrien': 'NTR.TO',
    'First Quantum': 'FM.TO',
    'Pan American': 'PAAS.TO',
    'Lundin Mining': 'LUN.TO',
    'Lundin Gold': 'LUG.TO',
    'Teck': 'TECK-B.TO',  // Renamed after coal spinoff
    'Alamos': 'AGI.TO',
    'Ivanhoe': 'IVN.TO',
    'Endeavour': 'EDV.TO',
    'Equinox': 'EQX.TO',
    'IAMGold': 'IMG.TO',
    'First Majestic': 'AG.TO',
    'NexGen': 'NXE.TO',
    'B2Gold': 'BTO.TO',
    'Capstone': 'CS.TO',
    'Energy Fuels': 'EFR.TO',
    'Torex': 'TXG.TO',
    'Hudbay': 'HBM.TO',
    'Eldorado': 'ELD.TO'
};

// Path to the exported JSON data
const DATA_FILE = path.join(__dirname, '..', 'data', 'ticker.json');

// Check if local data is fresh (within 30 minutes)
function isDataFresh(updatedAt) {
    if (!updatedAt) return false;
    const updated = new Date(updatedAt);
    const now = new Date();
    const diffMinutes = (now - updated) / (1000 * 60);
    return diffMinutes < 30;
}

// Read local ticker data
function readLocalData() {
    try {
        if (fs.existsSync(DATA_FILE)) {
            const content = fs.readFileSync(DATA_FILE, 'utf8');
            const parsed = JSON.parse(content);
            return parsed;
        }
    } catch (error) {
        console.error('Error reading local ticker data:', error.message);
    }
    return null;
}

// Fallback to Yahoo Finance
async function fetchFromYahoo() {
    if (!yahooFinance) {
        throw new Error('Yahoo Finance not available');
    }

    const symbols = Object.values(TICKERS);
    const results = await yahooFinance.quote(symbols);

    return results.map(quote => {
        const name = Object.keys(TICKERS).find(key => TICKERS[key] === quote.symbol) || quote.symbol;
        return {
            symbol: quote.symbol,
            name: name,
            price: quote.regularMarketPrice,
            change: quote.regularMarketChange,
            changePercent: quote.regularMarketChangePercent
        };
    });
}

module.exports = async (req, res) => {
    // Set caching to prevent hitting too frequently (1 minute cache)
    res.setHeader('Cache-Control', 's-maxage=60, stale-while-revalidate');

    try {
        // Try to read local data first (from our database export)
        const localData = readLocalData();

        if (localData && localData.data && isDataFresh(localData.updated_at)) {
            console.log(`Serving ${localData.count} tickers from local data (updated: ${localData.updated_at})`);
            return res.status(200).json(localData.data);
        }

        // If local data is stale or unavailable, try Yahoo Finance
        console.log('Local data unavailable or stale, falling back to Yahoo Finance');
        const yahooData = await fetchFromYahoo();
        return res.status(200).json(yahooData);

    } catch (error) {
        console.error('Ticker API Error:', error.message);

        // If everything fails, try to serve stale local data
        const localData = readLocalData();
        if (localData && localData.data) {
            console.log('Serving stale local data as last resort');
            return res.status(200).json(localData.data);
        }

        // Final fallback: return error
        return res.status(500).json({ error: 'Failed to fetch market data' });
    }
};
