import React, { useState } from 'react';
import { AppraisalRecord, MonthConfig } from '../types/appraisal';

interface RadarChartProps {
  record: AppraisalRecord;
  monthConfig: MonthConfig;
  groupAverage?: {
    absensi: number;
    downtime: number;
    specialMetric: number; // 5R for AD, PM Completion for PM
  };
  showBenchmark?: boolean;
}

export const RadarChart: React.FC<RadarChartProps> = ({
  record,
  monthConfig,
  groupAverage,
  showBenchmark = true,
}) => {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  const isPM = record.group === 'PM';
  const specialKey = isPM ? 'PM Completion' : '5R';
  const specialValue = isPM ? (record.pmCompletion ?? 0) : (record.fiveR ?? 0);
  const specialWeight = isPM
    ? monthConfig.weightsPM.pmCompletion
    : monthConfig.weightsAD.fiveR;

  const absensiWeight = isPM
    ? monthConfig.weightsPM.absensi
    : monthConfig.weightsAD.absensi;
  const downtimeWeight = isPM
    ? monthConfig.weightsPM.downtime
    : monthConfig.weightsAD.downtime;

  const axes = [
    {
      name: 'Absensi',
      value: record.absensi,
      weight: absensiWeight,
      avg: groupAverage?.absensi ?? 90,
      description: 'Presensi & Kehadiran',
      unit: '%',
    },
    {
      name: 'Downtime',
      value: record.downtime,
      weight: downtimeWeight,
      avg: groupAverage?.downtime ?? 50,
      description: 'Penurunan Gangguan Mesin',
      unit: '%',
    },
    {
      name: specialKey,
      value: specialValue,
      weight: specialWeight,
      avg: groupAverage?.specialMetric ?? (isPM ? 80 : 80),
      description: isPM ? 'Work Order Preventive Maint.' : 'Ringkas, Rapi, Resik, Rawat, Rajin',
      unit: '%',
    },
  ];

  // Radar geometry settings
  const size = 380;
  const cx = size / 2;
  const cy = size / 2;
  const maxRadius = 125;
  const levels = [20, 40, 60, 80, 100];
  const totalAxes = axes.length;

  // Convert polar coordinates to Cartesian
  const getCoordinates = (index: number, value: number, radiusMax = maxRadius) => {
    // 0 index at top (-PI/2), evenly spaced
    const angle = (Math.PI * 2 * index) / totalAxes - Math.PI / 2;
    const r = (Math.max(0, Math.min(100, value)) / 100) * radiusMax;
    return {
      x: cx + r * Math.cos(angle),
      y: cy + r * Math.sin(angle),
      angle,
    };
  };

  // Generate web polygon rings
  const getLevelPolygonPoints = (level: number) => {
    return axes
      .map((_, i) => {
        const { x, y } = getCoordinates(i, level);
        return `${x},${y}`;
      })
      .join(' ');
  };

  // Employee polygon points
  const employeePoints = axes
    .map((axis, i) => {
      const { x, y } = getCoordinates(i, axis.value);
      return `${x},${y}`;
    })
    .join(' ');

  // Group average polygon points
  const averagePoints = axes
    .map((axis, i) => {
      const { x, y } = getCoordinates(i, axis.avg);
      return `${x},${y}`;
    })
    .join(' ');

  return (
    <div className="relative flex flex-col items-center justify-center p-3 select-none">
      <div className="relative w-full max-w-[390px] aspect-square flex items-center justify-center">
        <svg
          viewBox={`0 0 ${size} ${size}`}
          className="w-full h-full overflow-visible drop-shadow-xs"
        >
          <defs>
            <linearGradient id="employeeGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#4f46e5" stopOpacity="0.45" />
              <stop offset="100%" stopColor="#6366f1" stopOpacity="0.2" />
            </linearGradient>
            <linearGradient id="avgGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#059669" stopOpacity="0.25" />
              <stop offset="100%" stopColor="#10b981" stopOpacity="0.08" />
            </linearGradient>
            <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
              <feDropShadow dx="0" dy="2" stdDeviation="3" floodColor="#4f46e5" floodOpacity="0.3" />
            </filter>
          </defs>

          {/* Web Background Polygons */}
          {levels.map((lvl) => (
            <polygon
              key={`level-${lvl}`}
              points={getLevelPolygonPoints(lvl)}
              fill={lvl % 40 === 0 ? 'rgba(30, 41, 59, 0.35)' : 'transparent'}
              stroke="#334155"
              strokeWidth={lvl === 100 ? '1.5' : '1'}
              strokeDasharray={lvl === 80 ? '3,3' : undefined}
            />
          ))}

          {/* Scale Numeric Ticks along Top Axis */}
          {levels.map((lvl) => {
            const { y } = getCoordinates(0, lvl);
            return (
              <text
                key={`tick-${lvl}`}
                x={cx + 6}
                y={y + 3}
                fill="#94a3b8"
                fontSize="10"
                fontFamily="inherit"
                className="font-mono"
              >
                {lvl}
              </text>
            );
          })}

          {/* Radial Axis Lines */}
          {axes.map((_, i) => {
            const { x, y } = getCoordinates(i, 100);
            return (
              <line
                key={`axis-line-${i}`}
                x1={cx}
                y1={cy}
                x2={x}
                y2={y}
                stroke="#334155"
                strokeWidth="1.2"
                strokeDasharray="2,2"
              />
            );
          })}

          {/* Group Average Benchmark Polygon (if enabled) */}
          {showBenchmark && groupAverage && (
            <g className="transition-all duration-300">
              <polygon
                points={averagePoints}
                fill="url(#avgGrad)"
                stroke="#34d399"
                strokeWidth="1.75"
                strokeDasharray="4,3"
                opacity="0.85"
              />
              {axes.map((axis, i) => {
                const { x, y } = getCoordinates(i, axis.avg);
                return (
                  <circle
                    key={`avg-point-${i}`}
                    cx={x}
                    cy={y}
                    r="3.5"
                    fill="#10b981"
                    stroke="#090d16"
                    strokeWidth="1.5"
                  />
                );
              })}
            </g>
          )}

          {/* Primary Employee Polygon */}
          <polygon
            points={employeePoints}
            fill="url(#employeeGrad)"
            stroke="#818cf8"
            strokeWidth="2.5"
            filter="url(#glow)"
            className="transition-all duration-300"
          />

          {/* Employee Vertex Points & Hover Targets */}
          {axes.map((axis, i) => {
            const { x, y } = getCoordinates(i, axis.value);
            const isHovered = hoveredIndex === i;
            return (
              <g
                key={`vertex-${i}`}
                className="cursor-pointer"
                onMouseEnter={() => setHoveredIndex(i)}
                onMouseLeave={() => setHoveredIndex(null)}
              >
                <circle
                  cx={x}
                  cy={y}
                  r={isHovered ? 7 : 5}
                  fill="#818cf8"
                  stroke="#090d16"
                  strokeWidth="2.5"
                  className="transition-all duration-200"
                />
                {/* Score Pill on vertex */}
                <text
                  x={x}
                  y={y - 10}
                  textAnchor="middle"
                  fill="#ffffff"
                  fontSize="11"
                  fontWeight="700"
                  className="font-mono tabular-nums pointer-events-none drop-shadow-md"
                >
                  {axis.value}
                </text>
              </g>
            );
          })}

          {/* Axis Labels & Weights (Surrounding the Chart) */}
          {axes.map((axis, i) => {
            const { x, y, angle } = getCoordinates(i, 118);
            let textAnchor: 'middle' | 'start' | 'end' = 'middle';
            let dy = 0;

            if (Math.cos(angle) > 0.3) {
              textAnchor = 'start';
            } else if (Math.cos(angle) < -0.3) {
              textAnchor = 'end';
            }

            if (Math.sin(angle) < -0.5) {
              dy = -8;
            } else if (Math.sin(angle) > 0.5) {
              dy = 14;
            }

            const isHovered = hoveredIndex === i;

            return (
              <g
                key={`label-${i}`}
                className="cursor-pointer transition-opacity duration-200"
                onMouseEnter={() => setHoveredIndex(i)}
                onMouseLeave={() => setHoveredIndex(null)}
              >
                <text
                  x={x}
                  y={y + dy}
                  textAnchor={textAnchor}
                  fill={isHovered ? '#a5b4fc' : '#f1f5f9'}
                  fontSize="12.5"
                  fontWeight="600"
                >
                  {axis.name}
                </text>
                <text
                  x={x}
                  y={y + dy + 13}
                  textAnchor={textAnchor}
                  fill="#94a3b8"
                  fontSize="10"
                  fontFamily="inherit"
                  className="tabular-nums"
                >
                  Bobot {axis.weight}% · Nilai: {axis.value}
                </text>
              </g>
            );
          })}
        </svg>

        {/* Central subtle hub */}
        <div className="absolute w-2 h-2 rounded-full bg-slate-600/70 pointer-events-none" />
      </div>

      {/* Legend & Hover Info */}
      <div className="mt-2 flex flex-wrap items-center justify-center gap-4 text-xs">
        <div className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-sm bg-indigo-500 inline-block shadow-xs" />
          <span className="font-medium text-slate-200">{record.name}</span>
        </div>
        {showBenchmark && (
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-0.5 border-t-2 border-dashed border-emerald-400 inline-block" />
            <span className="text-slate-300">Rata-rata Group {record.group}</span>
          </div>
        )}
        <div className="flex items-center gap-1.5 text-slate-400">
          <span className="w-2 h-2 rounded-full border border-slate-500 inline-block" />
          <span>Skala 0 - 100</span>
        </div>
      </div>
    </div>
  );
};
