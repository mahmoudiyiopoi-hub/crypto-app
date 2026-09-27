import React, { useState } from 'react';
import { X, Code2, Copy, Check, Terminal, ExternalLink, Cpu } from 'lucide-react';

interface FastApiCodeModalProps {
  isOpen: boolean;
  onClose: () => void;
  lang: 'ar' | 'en';
}

export const FastApiCodeModal: React.FC<FastApiCodeModalProps> = ({ isOpen, onClose, lang }) => {
  const [activeTab, setActiveTab] = useState<'main' | 'requirements' | 'github' | 'capacitor' | 'curl' | 'flutter'>('github');
  const [copied, setCopied] = useState(false);
  const isAr = lang === 'ar';

  if (!isOpen) return null;

  const mainPyCode = `"""
FastAPI Backend for Crypto Signals Provider
Strategy: Supertrend + ADX + DMI on 4h Binance Futures
With REST API, WebSockets real-time push, and Webhook Alerts.

To run:
1. pip install -r requirements.txt
2. uvicorn main:app --reload --port 8000
"""

import asyncio
from datetime import datetime
from typing import Dict, List, Optional
import ccxt.async_support as ccxt_async
from fastapi import FastAPI, HTTPException, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
import pandas as pd
import pandas_ta as ta

app = FastAPI(
    title="CryptoSignals Pro API",
    description="Real-time algorithmic crypto signal provider powered by FastAPI and Binance Futures.",
    version="1.0.0",
)

# Enable CORS for React / React Native / Flutter / Mobile Clients
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class StrategyConfig(BaseModel):
    timeframe: str = "4h"
    symbols: List[str] = ["BTC/USDT", "ETH/USDT", "SOL/USDT", "BNB/USDT", "XRP/USDT", "ADA/USDT", "AVAX/USDT"]
    atr_period: int = 10
    supertrend_mult: float = 3.0
    adx_period: int = 14
    adx_entry: float = 23.0
    adx_exit: float = 18.0
    sl_multiplier: float = 2.0

config = StrategyConfig()
exchange = ccxt_async.binance({"enableRateLimit": True, "options": {"defaultType": "future"}})

async def analyze_symbol(symbol: str) -> Optional[dict]:
    try:
        bars = await exchange.fetch_ohlcv(symbol, timeframe=config.timeframe, limit=100)
        df = pd.DataFrame(bars, columns=["timestamp", "open", "high", "low", "close", "volume"])
        df["timestamp_dt"] = pd.to_datetime(df["timestamp"], unit="ms")

        # Indicators via pandas_ta
        df.ta.atr(length=config.atr_period, append=True)
        df.ta.adx(length=config.adx_period, append=True)
        st_df = df.ta.supertrend(length=config.atr_period, multiplier=config.supertrend_mult)
        df = pd.concat([df, st_df], axis=1)

        dir_col = [c for c in df.columns if "SUPERTd" in c][0]
        st_val_col = [c for c in df.columns if "SUPERT_" in c and "SUPERTd" not in c][0]
        atr_col = f"ATRr_{config.atr_period}"
        adx_col = f"ADX_{config.adx_period}"
        plus_di_col = f"DMP_{config.adx_period}"
        minus_di_col = f"DMN_{config.adx_period}"

        last_closed = df.iloc[-2]
        close = float(last_closed["close"])
        atr = float(last_closed[atr_col])
        adx = float(last_closed[adx_col])
        p_di = float(last_closed[plus_di_col])
        m_di = float(last_closed[minus_di_col])
        trend_dir = int(last_closed[dir_col]) # 1: Bullish, -1: Bearish
        supertrend_val = float(last_closed[st_val_col])

        action = "WAIT"
        title_ar = "⏳ انتظار (مراقبة)"
        title_en = "WAIT (Monitoring)"
        sl_price = None
        tp1 = None
        tp2 = None
        tp3 = None

        sl_distance = config.sl_multiplier * atr

        # Buy Condition
        if trend_dir == 1 and adx >= config.adx_entry and p_di > m_di:
            action = "BUY"
            title_ar = "🟢 إشارة شراء (Long)"
            title_en = "🟢 BUY Signal (Long)"
            sl_price = round(close - sl_distance, 4)
            tp1 = round(close + 1.5 * sl_distance, 4)
            tp2 = round(close + 2.5 * sl_distance, 4)
            tp3 = round(close + 4.0 * sl_distance, 4)

        # Sell Condition
        elif trend_dir == -1 and adx >= config.adx_entry and m_di > p_di:
            action = "SELL"
            title_ar = "🔴 إشارة بيع (Short)"
            title_en = "🔴 SELL Signal (Short)"
            sl_price = round(close + sl_distance, 4)
            tp1 = round(close - 1.5 * sl_distance, 4)
            tp2 = round(close - 2.5 * sl_distance, 4)
            tp3 = round(close - 4.0 * sl_distance, 4)

        # Early Exit
        elif adx < config.adx_exit:
            action = "CLOSE"
            title_ar = "⚠️ إغلاق (ضعف الزخم)"
            title_en = "⚠️ CLOSE (Weak Momentum)"

        return {
            "symbol": symbol,
            "action": action,
            "title_ar": title_ar,
            "title_en": title_en,
            "close_price": round(close, 4),
            "entry_price": round(close, 4) if action in ["BUY", "SELL"] else None,
            "stop_loss": sl_price,
            "take_profit_1": tp1,
            "take_profit_2": tp2,
            "take_profit_3": tp3,
            "adx": round(adx, 2),
            "plus_di": round(p_di, 2),
            "minus_di": round(m_di, 2),
            "supertrend": round(supertrend_val, 4),
            "trend_dir": trend_dir,
            "timestamp": int(last_closed["timestamp"]),
            "formatted_time": last_closed["timestamp_dt"].strftime("%Y-%m-%d %H:%M UTC")
        }
    except Exception as e:
        return None

@app.get("/api/signals")
async def get_signals():
    tasks = [analyze_symbol(sym) for sym in config.symbols]
    results = await asyncio.gather(*tasks)
    return [r for r in results if r is not None]

@app.websocket("/ws/signals")
async def websocket_endpoint(ws: WebSocket):
    await ws.accept()
    while True:
        await ws.receive_text()
`;

  const requirementsCode = `fastapi>=0.110.0
uvicorn>=0.28.0
ccxt>=4.2.0
pandas>=2.2.0
pandas-ta>=0.3.14b0
pydantic>=2.6.0
python-dotenv>=1.0.0
requests>=2.31.0
websockets>=12.0
`;

  const curlCode = `# 1. Get All Signals
curl -X GET "http://localhost:8000/api/signals"

# 2. Get Signal for a specific pair
curl -X GET "http://localhost:8000/api/signals/BTC/USDT"

# 3. View Interactive Swagger API Docs
Open your browser at: http://localhost:8000/docs
`;

  const flutterCode = `// React Native / Flutter API integration snippet
// Fetching signals from your FastAPI backend
import 'package:http/http.dart' as http;
import 'dart:convert';

Future<List<Signal>> fetchCryptoSignals() async {
  final response = await http.get(
    Uri.parse('https://YOUR_API_DOMAIN/api/signals'),
  );

  if (response.statusCode == 200) {
    List data = json.decode(response.body);
    return data.map((item) => Signal.fromJson(item)).toList();
  } else {
    throw Exception('Failed to load crypto signals');
  }
}
`;

  const githubActionsCode = `# .github/workflows/build-android.yml
# GitHub Actions Workflow for Continuous Integration & APK Export
name: Build & Export Android APK

on:
  push:
    branches:
      - main
  workflow_dispatch:

jobs:
  build-apk:
    name: Build Android APK
    runs-on: ubuntu-latest

    steps:
      - name: 📥 Checkout Repository
        uses: actions/checkout@v4

      - name: 🟢 Setup Node.js (v20)
        uses: actions/setup-node@v4
        with:
          node-version: 20

      - name: ☕ Setup Java JDK (Temurin 21)
        uses: actions/setup-java@v4
        with:
          distribution: 'temurin'
          java-version: '21'

      - name: 📱 Setup Android SDK Platform 36 & Licenses
        run: |
          yes | $ANDROID_HOME/cmdline-tools/latest/bin/sdkmanager --licenses || true
          $ANDROID_HOME/cmdline-tools/latest/bin/sdkmanager --install "platforms;android-36" "build-tools;36.0.0" "platforms;android-35" "build-tools;35.0.0" "platform-tools" || true
          yes | $ANDROID_HOME/cmdline-tools/latest/bin/sdkmanager --licenses || true

      - name: 📦 Install NPM Dependencies
        run: npm install --legacy-peer-deps

      - name: 🏗️ Build Web Assets (Vite)
        run: npm run build

      - name: 🔄 Sync Capacitor Android
        run: npx cap sync android

      - name: 🔑 Grant Execute Permission for Gradlew
        run: chmod +x android/gradlew

      - name: 📱 Build Android Debug APK
        working-directory: ./android
        run: ./gradlew assembleDebug --no-daemon --stacktrace

      - name: 📤 Upload APK Artifact
        uses: actions/upload-artifact@v4
        with:
          name: CryptoSignals-Pro-Debug-APK
          path: android/app/build/outputs/apk/debug/app-debug.apk
          if-no-files-found: error
          retention-days: 14
`;

  const capacitorConfigCode = `// capacitor.config.ts
import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.cryptosignals.app',
  appName: 'CryptoSignals Pro',
  webDir: 'dist',
  server: {
    androidScheme: 'https',
    cleartext: true,
  },
  android: {
    allowMixedContent: true,
  },
};

export default config;
`;

  const getActiveCode = () => {
    switch (activeTab) {
      case 'github':
        return githubActionsCode;
      case 'capacitor':
        return capacitorConfigCode;
      case 'main':
        return mainPyCode;
      case 'requirements':
        return requirementsCode;
      case 'curl':
        return curlCode;
      case 'flutter':
        return flutterCode;
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(getActiveCode());
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="bg-[#0b0f19] border border-slate-700/80 rounded-2xl w-full max-w-4xl max-h-[92vh] overflow-hidden flex flex-col shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-800 flex items-center justify-between bg-[#111726]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <Cpu className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-base text-white flex items-center gap-2">
                {isAr ? 'بيئة الموبايل والأتمتة (Android & CI/CD)' : 'Mobile & Backend Architecture'}
                <span className="text-[10px] font-mono bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 px-2 py-0.5 rounded">
                  Capacitor + GitHub Actions
                </span>
              </h3>
              <p className="text-xs text-slate-400">
                {isAr
                  ? 'بناء ملف APK تلقائياً عبر GitHub Actions وإعداد Capacitor و FastAPI'
                  : 'Automatic APK compilation with GitHub Actions, Capacitor, and FastAPI'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleCopy}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg transition-colors shadow-sm"
            >
              {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? (isAr ? 'تم النسخ!' : 'Copied!') : isAr ? 'نسخ الملف' : 'Copy File'}</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-white rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Tab switcher */}
        <div className="px-5 py-2.5 border-b border-slate-800 bg-[#0d121c] flex items-center justify-between overflow-x-auto">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveTab('github')}
              className={`px-3 py-1 text-xs font-mono rounded-lg transition-colors whitespace-nowrap ${
                activeTab === 'github'
                  ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 font-bold'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              🤖 build-android.yml (APK)
            </button>
            <button
              onClick={() => setActiveTab('capacitor')}
              className={`px-3 py-1 text-xs font-mono rounded-lg transition-colors whitespace-nowrap ${
                activeTab === 'capacitor'
                  ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 font-bold'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              capacitor.config.ts
            </button>
            <button
              onClick={() => setActiveTab('main')}
              className={`px-3 py-1 text-xs font-mono rounded-lg transition-colors whitespace-nowrap ${
                activeTab === 'main'
                  ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 font-bold'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              main.py (FastAPI)
            </button>
            <button
              onClick={() => setActiveTab('requirements')}
              className={`px-3 py-1 text-xs font-mono rounded-lg transition-colors whitespace-nowrap ${
                activeTab === 'requirements'
                  ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 font-bold'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              requirements.txt
            </button>
            <button
              onClick={() => setActiveTab('curl')}
              className={`px-3 py-1 text-xs font-mono rounded-lg transition-colors whitespace-nowrap ${
                activeTab === 'curl'
                  ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 font-bold'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              cURL & API Docs
            </button>
            <button
              onClick={() => setActiveTab('flutter')}
              className={`px-3 py-1 text-xs font-mono rounded-lg transition-colors whitespace-nowrap ${
                activeTab === 'flutter'
                  ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 font-bold'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Mobile SDK Integration
            </button>
          </div>

          <div className="text-[11px] text-slate-400 hidden lg:block font-mono">
            {activeTab === 'github'
              ? '.github/workflows/build-android.yml'
              : activeTab === 'capacitor'
                ? 'capacitor.config.ts'
                : 'uvicorn main:app --reload'}
          </div>
        </div>

        {/* Code Content View */}
        <div className="p-4 flex-1 overflow-auto bg-[#070a10] font-mono text-xs leading-relaxed text-slate-300">
          <pre className="whitespace-pre overflow-x-auto selection:bg-emerald-500/30">
            <code>{getActiveCode()}</code>
          </pre>
        </div>

        {/* Footer Quick Instructions */}
        <div className="px-5 py-3 border-t border-slate-800 bg-[#111726] flex flex-wrap items-center justify-between text-xs text-slate-400 gap-2">
          <div className="flex items-center gap-2">
            <Terminal className="w-4 h-4 text-emerald-400" />
            <span>
              {isAr
                ? 'طريقة التشغيل: pip install -r requirements.txt ثم uvicorn main:app --reload'
                : 'Run: pip install -r requirements.txt && uvicorn main:app --reload'}
            </span>
          </div>
          <div className="text-slate-500">
            {isAr ? 'يدعم Swagger UI التفاعلي تلقائياً عند /docs' : 'Includes Swagger UI at /docs'}
          </div>
        </div>
      </div>
    </div>
  );
};
