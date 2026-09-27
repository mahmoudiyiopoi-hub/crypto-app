"""
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
    description="Real-time algorithmic crypto signal provider powered by FastAPI and Binance Futures public data.",
    version="1.0.0",
)

# Enable CORS for React / React Native / Mobile Clients
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ==========================================
# Strategy Configuration & State
# ==========================================
class StrategyConfig(BaseModel):
    timeframe: str = Field(default="4h", description="Candle timeframe e.g. 15m, 1h, 4h, 1d")
    symbols: List[str] = Field(
        default=["BTC/USDT", "ETH/USDT", "SOL/USDT", "BNB/USDT", "XRP/USDT", "ADA/USDT", "AVAX/USDT"]
    )
    atr_period: int = Field(default=10, description="ATR smoothing period")
    supertrend_mult: float = Field(default=3.0, description="Supertrend ATR multiplier")
    adx_period: int = Field(default=14, description="ADX smoothing period")
    adx_entry: float = Field(default=23.0, description="Minimum ADX required for entry")
    adx_exit: float = Field(default=18.0, description="ADX threshold for weak momentum exit")
    sl_multiplier: float = Field(default=2.0, description="Stop Loss ATR multiplier")

config = StrategyConfig()

# In-memory storage for latest signals
latest_signals_cache: Dict[str, dict] = {}
active_connections: List[WebSocket] = []

# Initialize CCXT async Binance Futures exchange client (No API keys required)
exchange = ccxt_async.binance({
    "enableRateLimit": True,
    "options": {"defaultType": "future"}
})

# ==========================================
# Data Models
# ==========================================
class SignalResponse(BaseModel):
    id: str
    symbol: str
    action: str  # BUY, SELL, CLOSE, WAIT
    title_ar: str
    title_en: str
    entry_price: Optional[float] = None
    stop_loss: Optional[float] = None
    sl_percent: Optional[float] = None
    take_profit_1: Optional[float] = None
    take_profit_2: Optional[float] = None
    take_profit_3: Optional[float] = None
    adx: float
    plus_di: float
    minus_di: float
    supertrend: float
    trend_dir: int
    current_price: float
    timestamp: int
    formatted_time: str
    reason_ar: str
    reason_en: str

# ==========================================
# Core Quantitative Calculation Engine
# ==========================================
async def analyze_symbol(symbol: str) -> Optional[dict]:
    try:
        bars = await exchange.fetch_ohlcv(symbol, timeframe=config.timeframe, limit=100)
        if not bars or len(bars) < 20:
            return None

        df = pd.DataFrame(bars, columns=["timestamp", "open", "high", "low", "close", "volume"])
        df["timestamp_dt"] = pd.to_datetime(df["timestamp"], unit="ms")

        # Technical Indicators calculation using pandas_ta
        df.ta.atr(length=config.atr_period, append=True)
        df.ta.adx(length=config.adx_period, append=True)
        st_df = df.ta.supertrend(length=config.atr_period, multiplier=config.supertrend_mult)
        df = pd.concat([df, st_df], axis=1)

        # Dynamic column names from pandas_ta
        dir_col = [c for c in df.columns if "SUPERTd" in c][0]
        st_val_col = [c for c in df.columns if "SUPERT_" in c and "SUPERTd" not in c][0]
        atr_col = f"ATRr_{config.atr_period}"
        adx_col = f"ADX_{config.adx_period}"
        plus_di_col = f"DMP_{config.adx_period}"
        minus_di_col = f"DMN_{config.adx_period}"

        # Evaluate on the last completed candle (index -2)
        last_closed = df.iloc[-2]
        close = float(last_closed["close"])
        atr = float(last_closed[atr_col])
        adx = float(last_closed[adx_col])
        p_di = float(last_closed[plus_di_col])
        m_di = float(last_closed[minus_di_col])
        trend_dir = int(last_closed[dir_col])  # 1: Bullish, -1: Bearish
        supertrend_val = float(last_closed[st_val_col])

        # Current live candle close
        current_price = float(df.iloc[-1]["close"])

        # Signal Logic
        action = "WAIT"
        title_ar = "⏳ انتظار (مراقبة)"
        title_en = "WAIT (Monitoring)"
        reason_ar = "لا تتطابق شروط الدخول مع معايير الاستراتيجية الحالية"
        reason_en = "Current indicators do not meet entry criteria"
        entry_price = None
        sl_price = None
        sl_percent = None
        tp1 = None
        tp2 = None
        tp3 = None

        sl_distance = config.sl_multiplier * atr

        # 1. Long Entry Condition
        if trend_dir == 1 and adx >= config.adx_entry and p_di > m_di:
            action = "BUY"
            title_ar = "🟢 إشارة شراء (Long)"
            title_en = "🟢 BUY Signal (Long)"
            entry_price = round(close, 4)
            sl_price = round(close - sl_distance, 4)
            sl_percent = round(-((close - sl_price) / close) * 100, 2)
            tp1 = round(close + 1.5 * sl_distance, 4)
            tp2 = round(close + 2.5 * sl_distance, 4)
            tp3 = round(close + 4.0 * sl_distance, 4)
            reason_ar = f"ترند صاعد مع زخم قوي (ADX = {adx:.1f} ≥ {config.adx_entry}) و +DI > -DI"
            reason_en = f"Bullish Supertrend with strong momentum (ADX={adx:.1f}) and +DI > -DI"

        # 2. Short Entry Condition
        elif trend_dir == -1 and adx >= config.adx_entry and m_di > p_di:
            action = "SELL"
            title_ar = "🔴 إشارة بيع (Short)"
            title_en = "🔴 SELL Signal (Short)"
            entry_price = round(close, 4)
            sl_price = round(close + sl_distance, 4)
            sl_percent = round(-((sl_price - close) / close) * 100, 2)
            tp1 = round(close - 1.5 * sl_distance, 4)
            tp2 = round(close - 2.5 * sl_distance, 4)
            tp3 = round(close - 4.0 * sl_distance, 4)
            reason_ar = f"ترند هابط مع زخم قوي (ADX = {adx:.1f} ≥ {config.adx_entry}) و -DI > +DI"
            reason_en = f"Bearish Supertrend with strong momentum (ADX={adx:.1f}) and -DI > +DI"

        # 3. Early Exit (Close)
        elif adx < config.adx_exit:
            action = "CLOSE"
            title_ar = "⚠️ إغلاق (ضعف الزخم)"
            title_en = "⚠️ CLOSE (Weak Momentum)"
            reason_ar = f"انخفاض قوة الزخم (ADX = {adx:.1f} < {config.adx_exit})، يوصى بالخروج"
            reason_en = f"Weak momentum (ADX={adx:.1f} < {config.adx_exit}), exit advised"

        ts_int = int(last_closed["timestamp"])
        formatted_time = last_closed["timestamp_dt"].strftime("%Y-%m-%d %H:%M UTC")

        signal_obj = {
            "id": f"{symbol.replace('/', '')}-{ts_int}-{action}",
            "symbol": symbol,
            "action": action,
            "title_ar": title_ar,
            "title_en": title_en,
            "entry_price": entry_price,
            "stop_loss": sl_price,
            "sl_percent": sl_percent,
            "take_profit_1": tp1,
            "take_profit_2": tp2,
            "take_profit_3": tp3,
            "adx": round(adx, 2),
            "plus_di": round(p_di, 2),
            "minus_di": round(m_di, 2),
            "supertrend": round(supertrend_val, 4),
            "trend_dir": trend_dir,
            "current_price": round(current_price, 4),
            "timestamp": ts_int,
            "formatted_time": formatted_time,
            "reason_ar": reason_ar,
            "reason_en": reason_en,
        }

        latest_signals_cache[symbol] = signal_obj
        return signal_obj

    except Exception as e:
        print(f"Error processing {symbol}: {e}")
        return None

# ==========================================
# REST API Endpoints
# ==========================================
@app.get("/")
def root():
    return {
        "status": "online",
        "service": "CryptoSignals Pro API",
        "docs_url": "/docs",
        "symbols_count": len(config.symbols),
        "timeframe": config.timeframe,
    }

@app.get("/api/signals", response_model=List[SignalResponse])
async def get_all_signals():
    """Returns signals for all configured cryptocurrency pairs."""
    tasks = [analyze_symbol(sym) for sym in config.symbols]
    results = await asyncio.gather(*tasks)
    return [r for r in results if r is not None]

@app.get("/api/signals/{symbol:path}", response_model=SignalResponse)
async def get_single_signal(symbol: str):
    """Returns signal for a specific symbol e.g. BTC/USDT or BTCUSDT."""
    formatted_symbol = symbol.replace("-", "/").upper()
    if "/" not in formatted_symbol and "USDT" in formatted_symbol:
        formatted_symbol = formatted_symbol.replace("USDT", "/USDT")

    res = await analyze_symbol(formatted_symbol)
    if not res:
        raise HTTPException(status_code=404, detail="Symbol data unavailable")
    return res

@app.get("/api/config")
def get_config():
    return config

@app.post("/api/config")
def update_config(new_config: StrategyConfig):
    global config
    config = new_config
    return {"message": "Config updated successfully", "config": config}

# ==========================================
# Real-Time WebSocket Endpoint
# ==========================================
@app.websocket("/ws/signals")
async def websocket_signals_endpoint(websocket: WebSocket):
    """
    WebSocket stream pushing updated signals to React / Mobile clients.
    """
    await websocket.accept()
    active_connections.append(websocket)
    try:
        # Send initial snapshot immediately upon connect
        initial_signals = list(latest_signals_cache.values())
        await websocket.send_json({"type": "SNAPSHOT", "data": initial_signals})

        # Keep connection open and receive any client ping
        while True:
            await websocket.receive_text()
    except WebSocketDisconnect:
        active_connections.remove(websocket)
    except Exception:
        if websocket in active_connections:
            active_connections.remove(websocket)

# Background Polling Loop (every 60 seconds)
@app.on_event("startup")
async def start_background_scanner():
    async def scanner_loop():
        while True:
            try:
                for sym in config.symbols:
                    sig = await analyze_symbol(sym)
                    if sig and sig["action"] in ["BUY", "SELL", "CLOSE"]:
                        # Broadcast alert to all active connected clients
                        for ws in list(active_connections):
                            try:
                                await ws.send_json({"type": "NEW_SIGNAL", "signal": sig})
                            except Exception:
                                pass
            except Exception as e:
                print("Scanner error:", e)
            await asyncio.sleep(60)

    asyncio.create_task(scanner_loop())

@app.on_event("shutdown")
async def shutdown_exchange():
    await exchange.close()
