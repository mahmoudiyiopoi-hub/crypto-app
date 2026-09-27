import express from 'express';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { createServer as createViteServer } from 'vite';
import {
  DEFAULT_PARAMS,
  DEFAULT_SYMBOLS,
  calculateIndicators,
  generateSignalFromBars,
} from './src/utils/indicators.ts';
import { fetchOHLCV, fetch24hrTicker } from './src/utils/binanceApi.ts';
import { StrategyParams } from './src/types/crypto.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const isProduction = process.env.NODE_ENV === 'production';
const PORT = process.env.PORT || 3000;

async function startServer() {
  const app = express();
  app.use(express.json());

  // Mutable in-memory config & active symbols
  let currentParams: StrategyParams = { ...DEFAULT_PARAMS };
  let watchedSymbols = [...DEFAULT_SYMBOLS];

  // API Route: Get Strategy Config
  app.get('/api/config', (req, res) => {
    res.json({
      config: currentParams,
      symbols: watchedSymbols,
    });
  });

  // API Route: Update Strategy Config
  app.post('/api/config', (req, res) => {
    const { params, symbols } = req.body;
    if (params) {
      currentParams = { ...currentParams, ...params };
    }
    if (Array.isArray(symbols)) {
      watchedSymbols = symbols;
    }
    res.json({
      success: true,
      config: currentParams,
      symbols: watchedSymbols,
    });
  });

  // API Route: Get All Real-Time Signals
  app.get('/api/signals', async (req, res) => {
    try {
      const timeframe = (req.query.timeframe as string) || currentParams.timeframe || '4h';
      const symbolsToScan = req.query.symbols
        ? (req.query.symbols as string).split(',')
        : watchedSymbols;

      const signalPromises = symbolsToScan.map(async (symbol) => {
        try {
          const [bars, ticker] = await Promise.all([
            fetchOHLCV(symbol, timeframe, 100),
            fetch24hrTicker(symbol),
          ]);

          const calculated = calculateIndicators(bars, currentParams);
          const signal = generateSignalFromBars(
            symbol,
            calculated,
            ticker.lastPrice,
            ticker.priceChangePercent,
            currentParams
          );
          return signal;
        } catch (err: any) {
          console.error(`Error analyzing ${symbol}:`, err.message);
          return null;
        }
      });

      const results = await Promise.all(signalPromises);
      const validSignals = results.filter((s) => s !== null);

      res.json({
        success: true,
        count: validSignals.length,
        timeframe,
        signals: validSignals,
      });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // API Route: Get Candlesticks & Technical Overlays for Chart
  app.get('/api/candles', async (req, res) => {
    try {
      const symbol = (req.query.symbol as string) || 'BTC/USDT';
      const timeframe = (req.query.timeframe as string) || currentParams.timeframe || '4h';
      const limit = parseInt(req.query.limit as string) || 80;

      const rawBars = await fetchOHLCV(symbol, timeframe, limit);
      const calculated = calculateIndicators(rawBars, currentParams);

      res.json({
        success: true,
        symbol,
        timeframe,
        candles: calculated,
      });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // API Route: Get FastAPI Python Code for export/viewing
  app.get('/api/fastapi-code', (req, res) => {
    try {
      const filePath = path.join(__dirname, 'backend', 'main.py');
      const reqPath = path.join(__dirname, 'backend', 'requirements.txt');
      const code = fs.existsSync(filePath) ? fs.readFileSync(filePath, 'utf-8') : '';
      const requirements = fs.existsSync(reqPath) ? fs.readFileSync(reqPath, 'utf-8') : '';
      res.json({
        success: true,
        filename: 'main.py',
        code,
        requirements,
      });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // Mount Vite or serve static production build
  if (!isProduction) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.join(__dirname, 'dist')));
    app.get('*', (req, res) => {
      res.sendFile(path.join(__dirname, 'dist', 'index.html'));
    });
  }

  app.listen(PORT, () => {
    console.log(`Server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer();
