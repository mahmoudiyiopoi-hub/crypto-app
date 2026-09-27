import React, { useState, useEffect, useMemo, useRef } from 'react';
import { CryptoSignal, CalculatedBar } from '../types/crypto';
import { fetchOHLCV } from '../utils/binanceApi';
import { calculateIndicators, DEFAULT_PARAMS } from '../utils/indicators';
import { X, RefreshCw, ZoomIn, ZoomOut, Maximize2 } from 'lucide-react';

interface CandleChartModalProps {
  signal: CryptoSignal | null;
  onClose: () => void;
  lang: 'ar' | 'en';
}

export const CandleChartModal: React.FC<CandleChartModalProps> = ({
  signal,
  onClose,
  lang,
}) => {
  const [timeframe, setTimeframe] = useState<string>('4h');
  const [candles, setCandles] = useState<CalculatedBar[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);
  const [visibleCount, setVisibleCount] = useState<number>(50); // Zoom level: 30 to 80 candles
  const isAr = lang === 'ar';

  const svgRef = useRef<SVGSVGElement | null>(null);

  // Fetch candles when signal or timeframe changes
  useEffect(() => {
    if (!signal) return;

    let isMounted = true;
    setIsLoading(true);

    fetchOHLCV(signal.symbol, timeframe, 100)
      .then((raw) => {
        if (!isMounted) return;
        const calculated = calculateIndicators(raw, DEFAULT_PARAMS);
        setCandles(calculated);
        setIsLoading(false);
      })
      .catch((err) => {
        console.error('Failed to load chart candles', err);
        if (isMounted) setIsLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [signal, timeframe]);

  // Sliced data based on zoom
  const displayBars = useMemo(() => {
    if (candles.length === 0) return [];
    return candles.slice(-visibleCount);
  }, [candles, visibleCount]);

  // Price Extents for scaling
  const { minPrice, maxPrice, maxAdx } = useMemo(() => {
    if (displayBars.length === 0) return { minPrice: 0, maxPrice: 1, maxAdx: 50 };

    let min = Infinity;
    let max = -Infinity;
    let highestAdx = 30;

    displayBars.forEach((b) => {
      if (b.low < min) min = b.low;
      if (b.high > max) max = b.high;
      if (b.supertrend) {
        if (b.supertrend < min) min = b.supertrend;
        if (b.supertrend > max) max = b.supertrend;
      }
      if (b.adx && b.adx > highestAdx) highestAdx = b.adx;
    });

    const padding = (max - min) * 0.08;
    return {
      minPrice: Math.max(0, min - padding),
      maxPrice: max + padding,
      maxAdx: Math.max(50, highestAdx * 1.1),
    };
  }, [displayBars]);

  if (!signal) return null;

  // Chart Dimensions
  const width = 800;
  const mainHeight = 320;
  const subHeight = 110;
  const gap = 20;
  const totalHeight = mainHeight + gap + subHeight;
  const paddingRight = 65;
  const paddingLeft = 10;
  const chartWidth = width - paddingRight - paddingLeft;

  const barCount = displayBars.length;
  const candleSlotWidth = barCount > 0 ? chartWidth / barCount : 10;
  const candleBodyWidth = Math.max(2, candleSlotWidth * 0.65);

  const priceToY = (price: number) => {
    if (maxPrice === minPrice) return mainHeight / 2;
    return mainHeight - ((price - minPrice) / (maxPrice - minPrice)) * mainHeight;
  };

  const adxToY = (val: number) => {
    const clamped = Math.max(0, Math.min(maxAdx, val));
    return mainHeight + gap + subHeight - (clamped / maxAdx) * subHeight;
  };

  const hoveredBar = hoverIndex !== null && displayBars[hoverIndex] ? displayBars[hoverIndex] : null;

  const handleMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
    if (!svgRef.current || barCount === 0) return;
    const rect = svgRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left - paddingLeft;
    const index = Math.floor(x / candleSlotWidth);
    if (index >= 0 && index < barCount) {
      setHoverIndex(index);
    } else {
      setHoverIndex(null);
    }
  };

  const handleMouseLeave = () => {
    setHoverIndex(null);
  };

  const formatNum = (n?: number | null) => {
    if (n === undefined || n === null) return '-';
    return n >= 1000 ? n.toFixed(2) : n.toFixed(4);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="bg-[#0e1422] border border-slate-700/80 rounded-2xl w-full max-w-4xl max-h-[95vh] overflow-hidden flex flex-col shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Top Bar */}
        <div className="px-5 py-3.5 border-b border-slate-800 flex items-center justify-between bg-[#121929]">
          <div className="flex items-center gap-3">
            <span className="font-bold text-base sm:text-lg text-white">
              {signal.symbol}
            </span>
            <span className="text-xs px-2 py-0.5 rounded bg-slate-800 text-slate-300 font-mono">
              Binance Futures
            </span>
            {/* Timeframe switch */}
            <div className="flex items-center bg-[#090d16] p-0.5 rounded-lg border border-slate-800">
              {['15m', '1h', '4h', '1d'].map((tf) => (
                <button
                  key={tf}
                  onClick={() => setTimeframe(tf)}
                  className={`px-2 py-0.5 text-xs font-semibold rounded ${
                    timeframe === tf
                      ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  {tf}
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Zoom Controls */}
            <div className="flex items-center gap-1 bg-[#090d16] p-0.5 rounded-lg border border-slate-800">
              <button
                onClick={() => setVisibleCount((prev) => Math.max(25, prev - 10))}
                title="Zoom In"
                className="p-1 text-slate-400 hover:text-white"
              >
                <ZoomIn className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => setVisibleCount((prev) => Math.min(90, prev + 10))}
                title="Zoom Out"
                className="p-1 text-slate-400 hover:text-white"
              >
                <ZoomOut className="w-3.5 h-3.5" />
              </button>
            </div>

            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Hover / Current Bar Inspection Strip */}
        <div className="px-5 py-2 bg-[#090d16] border-b border-slate-800/80 flex flex-wrap items-center justify-between text-xs font-mono tabular-nums text-slate-300 gap-x-4 gap-y-1">
          {hoveredBar ? (
            <>
              <div>
                <span className="text-slate-500 mr-1">{isAr ? 'الوقت:' : 'Time:'}</span>
                <span className="text-white">
                  {new Date(hoveredBar.timestamp).toLocaleString(isAr ? 'ar-EG' : 'en-US', {
                    month: 'short',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span>O: <span className="text-white">${formatNum(hoveredBar.open)}</span></span>
                <span>H: <span className="text-white">${formatNum(hoveredBar.high)}</span></span>
                <span>L: <span className="text-white">${formatNum(hoveredBar.low)}</span></span>
                <span>
                  C:{' '}
                  <span
                    className={
                      hoveredBar.close >= hoveredBar.open ? 'text-emerald-400' : 'text-rose-400'
                    }
                  >
                    ${formatNum(hoveredBar.close)}
                  </span>
                </span>
              </div>
              <div className="flex items-center gap-3">
                <span>
                  ST: <span className="text-cyan-400">${formatNum(hoveredBar.supertrend)}</span>
                </span>
                <span>
                  ADX: <span className="text-amber-400">{hoveredBar.adx?.toFixed(1) || '-'}</span>
                </span>
                <span>
                  +DI: <span className="text-emerald-400">{hoveredBar.plusDi?.toFixed(1) || '-'}</span>
                </span>
                <span>
                  -DI: <span className="text-rose-400">{hoveredBar.minusDi?.toFixed(1) || '-'}</span>
                </span>
              </div>
            </>
          ) : (
            <div className="text-slate-400 flex items-center justify-between w-full">
              <span>{isAr ? 'حرك المؤشر فوق الشموع لعرض التفاصيل اللحظية' : 'Hover over candles to view precise indicator values'}</span>
              <div className="flex items-center gap-3">
                <span className="flex items-center gap-1">
                  <span className="w-2.5 h-0.5 bg-cyan-400 inline-block" /> Supertrend
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-2.5 h-0.5 bg-amber-400 inline-block" /> ADX (14)
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-2.5 h-0.5 bg-emerald-400 inline-block" /> +DI
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-2.5 h-0.5 bg-rose-400 inline-block" /> -DI
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Chart Viewport */}
        <div className="p-4 flex-1 flex flex-col items-center justify-center overflow-auto">
          {isLoading ? (
            <div className="h-80 flex flex-col items-center justify-center gap-3 text-slate-400">
              <RefreshCw className="w-6 h-6 animate-spin text-emerald-400" />
              <span>{isAr ? 'جاري قراءة الشموع وحساب المؤشرات...' : 'Fetching klines & computing indicators...'}</span>
            </div>
          ) : (
            <div className="w-full overflow-x-auto">
              <svg
                ref={svgRef}
                viewBox={`0 0 ${width} ${totalHeight}`}
                className="w-full h-auto select-none cursor-crosshair"
                onMouseMove={handleMouseMove}
                onMouseLeave={handleMouseLeave}
              >
                {/* Background Grid */}
                <defs>
                  <linearGradient id="bullCandle" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#10b981" />
                    <stop offset="100%" stopColor="#059669" />
                  </linearGradient>
                  <linearGradient id="bearCandle" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#f43f5e" />
                    <stop offset="100%" stopColor="#e11d48" />
                  </linearGradient>
                </defs>

                {/* Horizontal price grid lines */}
                {[0.2, 0.4, 0.6, 0.8].map((ratio) => {
                  const y = mainHeight * ratio;
                  const price = maxPrice - ratio * (maxPrice - minPrice);
                  return (
                    <g key={ratio}>
                      <line
                        x1={paddingLeft}
                        y1={y}
                        x2={width - paddingRight}
                        y2={y}
                        stroke="#1e293b"
                        strokeDasharray="3 3"
                        strokeWidth="1"
                      />
                      <text
                        x={width - paddingRight + 5}
                        y={y + 4}
                        fill="#64748b"
                        fontSize="10"
                        fontFamily="monospace"
                      >
                        ${formatNum(price)}
                      </text>
                    </g>
                  );
                })}

                {/* Candlesticks & Supertrend Line */}
                {displayBars.map((bar, i) => {
                  const x = paddingLeft + i * candleSlotWidth + candleSlotWidth / 2;
                  const isBullish = bar.close >= bar.open;
                  const openY = priceToY(bar.open);
                  const closeY = priceToY(bar.close);
                  const highY = priceToY(bar.high);
                  const lowY = priceToY(bar.low);

                  const bodyY = Math.min(openY, closeY);
                  const bodyHeight = Math.max(1.5, Math.abs(closeY - openY));

                  return (
                    <g key={bar.timestamp}>
                      {/* High-Low Wick */}
                      <line
                        x1={x}
                        y1={highY}
                        x2={x}
                        y2={lowY}
                        stroke={isBullish ? '#10b981' : '#f43f5e'}
                        strokeWidth="1"
                      />
                      {/* Candle Body */}
                      <rect
                        x={x - candleBodyWidth / 2}
                        y={bodyY}
                        width={candleBodyWidth}
                        height={bodyHeight}
                        fill={isBullish ? '#10b981' : '#f43f5e'}
                        rx="1"
                      />
                    </g>
                  );
                })}

                {/* Supertrend Path */}
                {(() => {
                  let pathStr = '';
                  displayBars.forEach((bar, i) => {
                    if (bar.supertrend) {
                      const x = paddingLeft + i * candleSlotWidth + candleSlotWidth / 2;
                      const y = priceToY(bar.supertrend);
                      if (i === 0) pathStr += `M ${x} ${y}`;
                      else pathStr += ` L ${x} ${y}`;
                    }
                  });
                  return (
                    <path
                      d={pathStr}
                      fill="none"
                      stroke="#22d3ee"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  );
                })()}

                {/* Active Signal Markers (Entry, Stop Loss, TP1) */}
                {signal.entryPrice && (
                  <g>
                    <line
                      x1={paddingLeft}
                      y1={priceToY(signal.entryPrice)}
                      x2={width - paddingRight}
                      y2={priceToY(signal.entryPrice)}
                      stroke="#38bdf8"
                      strokeDasharray="4 4"
                      strokeWidth="1.5"
                    />
                    <text
                      x={width - paddingRight + 5}
                      y={priceToY(signal.entryPrice) + 3}
                      fill="#38bdf8"
                      fontSize="9"
                      fontFamily="monospace"
                      fontWeight="bold"
                    >
                      Entry
                    </text>
                  </g>
                )}

                {signal.stopLoss && (
                  <g>
                    <line
                      x1={paddingLeft}
                      y1={priceToY(signal.stopLoss)}
                      x2={width - paddingRight}
                      y2={priceToY(signal.stopLoss)}
                      stroke="#f43f5e"
                      strokeDasharray="4 4"
                      strokeWidth="1.5"
                    />
                    <text
                      x={width - paddingRight + 5}
                      y={priceToY(signal.stopLoss) + 3}
                      fill="#f43f5e"
                      fontSize="9"
                      fontFamily="monospace"
                      fontWeight="bold"
                    >
                      SL
                    </text>
                  </g>
                )}

                {signal.tp1 && (
                  <g>
                    <line
                      x1={paddingLeft}
                      y1={priceToY(signal.tp1)}
                      x2={width - paddingRight}
                      y2={priceToY(signal.tp1)}
                      stroke="#10b981"
                      strokeDasharray="4 4"
                      strokeWidth="1.5"
                    />
                    <text
                      x={width - paddingRight + 5}
                      y={priceToY(signal.tp1) + 3}
                      fill="#10b981"
                      fontSize="9"
                      fontFamily="monospace"
                      fontWeight="bold"
                    >
                      TP1
                    </text>
                  </g>
                )}

                {/* Divider between Main Chart & Sub Chart */}
                <line
                  x1={0}
                  y1={mainHeight + gap / 2}
                  x2={width}
                  y2={mainHeight + gap / 2}
                  stroke="#1e293b"
                  strokeWidth="1"
                />

                {/* Sub-Chart: ADX & DMI */}
                {/* Reference line 23 (Entry trigger) */}
                <line
                  x1={paddingLeft}
                  y1={adxToY(23)}
                  x2={width - paddingRight}
                  y2={adxToY(23)}
                  stroke="#10b981"
                  strokeDasharray="2 2"
                  strokeWidth="1"
                />
                <text
                  x={width - paddingRight + 5}
                  y={adxToY(23) + 3}
                  fill="#10b981"
                  fontSize="9"
                  fontFamily="monospace"
                >
                  23 (Entry)
                </text>

                {/* Reference line 18 (Exit trigger) */}
                <line
                  x1={paddingLeft}
                  y1={adxToY(18)}
                  x2={width - paddingRight}
                  y2={adxToY(18)}
                  stroke="#f43f5e"
                  strokeDasharray="2 2"
                  strokeWidth="1"
                />
                <text
                  x={width - paddingRight + 5}
                  y={adxToY(18) + 3}
                  fill="#f43f5e"
                  fontSize="9"
                  fontFamily="monospace"
                >
                  18 (Exit)
                </text>

                {/* +DI Line (Emerald) */}
                {(() => {
                  let pathStr = '';
                  displayBars.forEach((bar, i) => {
                    const x = paddingLeft + i * candleSlotWidth + candleSlotWidth / 2;
                    const y = adxToY(bar.plusDi || 0);
                    if (i === 0) pathStr += `M ${x} ${y}`;
                    else pathStr += ` L ${x} ${y}`;
                  });
                  return <path d={pathStr} fill="none" stroke="#10b981" strokeWidth="1.2" />;
                })()}

                {/* -DI Line (Rose) */}
                {(() => {
                  let pathStr = '';
                  displayBars.forEach((bar, i) => {
                    const x = paddingLeft + i * candleSlotWidth + candleSlotWidth / 2;
                    const y = adxToY(bar.minusDi || 0);
                    if (i === 0) pathStr += `M ${x} ${y}`;
                    else pathStr += ` L ${x} ${y}`;
                  });
                  return <path d={pathStr} fill="none" stroke="#f43f5e" strokeWidth="1.2" />;
                })()}

                {/* ADX Curve (Amber bold) */}
                {(() => {
                  let pathStr = '';
                  displayBars.forEach((bar, i) => {
                    const x = paddingLeft + i * candleSlotWidth + candleSlotWidth / 2;
                    const y = adxToY(bar.adx || 0);
                    if (i === 0) pathStr += `M ${x} ${y}`;
                    else pathStr += ` L ${x} ${y}`;
                  });
                  return <path d={pathStr} fill="none" stroke="#fbbf24" strokeWidth="2" />;
                })()}

                {/* Interactive Crosshair & Cursor */}
                {hoverIndex !== null && (
                  <g>
                    <line
                      x1={paddingLeft + hoverIndex * candleSlotWidth + candleSlotWidth / 2}
                      y1={0}
                      x2={paddingLeft + hoverIndex * candleSlotWidth + candleSlotWidth / 2}
                      y2={totalHeight}
                      stroke="#94a3b8"
                      strokeDasharray="2 2"
                      strokeWidth="1"
                    />
                  </g>
                )}
              </svg>
            </div>
          )}
        </div>

        {/* Modal Footer Note */}
        <div className="px-5 py-3 border-t border-slate-800 bg-[#090d16] flex items-center justify-between text-xs text-slate-400">
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-cyan-400" />
              {isAr ? 'خط السوبر تريند (Supertrend)' : 'Supertrend Band'}
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-amber-400" />
              {isAr ? 'منحنى ADX (قوة الزخم)' : 'ADX Curve'}
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-400" />
              +DI (المشترون)
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-rose-400" />
              -DI (البائعون)
            </span>
          </div>

          <button
            onClick={onClose}
            className="px-4 py-1.5 text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-white rounded-lg transition-colors"
          >
            {isAr ? 'إغلاق النافذة' : 'Close'}
          </button>
        </div>
      </div>
    </div>
  );
};
