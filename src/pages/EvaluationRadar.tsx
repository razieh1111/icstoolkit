"use client";

import React, { useEffect, useState } from 'react';
import WipeContentButton from '@/components/WipeContentButton';
import { useLcd } from '@/context/LcdContext';
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer, Legend } from 'recharts';
import { EvaluationLevel } from '@/types/lcd';
import StrategyInsightBox from '@/components/StrategyInsightBox';
import { getStrategyPriorityForDisplay } from '@/utils/lcdUtils';

// Custom tick component for the PolarRadiusAxis
const CustomRadiusTick = ({ x, y, payload }: any) => {
  const scoreToLabel: Record<number, string> = {
    1: 'Poor',
    2: 'Mediocre',
    3: 'Good',
    4: 'Excellent',
  };
  const label = scoreToLabel[payload.value];

  // Only render labels for scores 1-4
  if (!label) {
    return null;
  }

  return (
    <g transform={`translate(${x},${y})`}>
      <text x={-10} y={0} dy={4} textAnchor="end" fill="#333" fontSize={10} fontFamily="Roboto">
        {label}
      </text>
    </g>
  );
};

const EvaluationRadar: React.FC = () => {
  const { strategies, evaluationChecklists, setRadarChartData, radarChartData, qualitativeEvaluation, radarInsights, setRadarInsights } = useLcd();

  // Map EvaluationLevel to a numerical score for the radar chart
  const evaluationToScore: Record<EvaluationLevel, number> = {
    'Poor': 1,
    'Mediocre': 2,
    'Good': 3,
    'Excellent': 4,
    'N/A': 0, // N/A will be treated as 0 or not shown
    'Yes': 4,
    'Partially': 2.5,
    'No': 1,
  };

  // Function to calculate the average evaluation for a strategy
  const calculateStrategyAverage = (concept: 'A' | 'B', strategyId: string): number => {
    const conceptChecklists = evaluationChecklists[concept];
    if (!conceptChecklists) return 0;

    const strategy = strategies.find(s => s.id === strategyId);
    if (!strategy) return 0;

    let totalScore = 0;
    let count = 0;

    if (conceptChecklists.level === 'Simplified') {
      const evalLevel = conceptChecklists.strategies[strategyId] || 'N/A';
      totalScore += evaluationToScore[evalLevel];
      count = 1;
    } else if (conceptChecklists.level === 'Normal') {
      const subStrategyEvals = strategy.subStrategies.map(ss => conceptChecklists.subStrategies[ss.id] || 'N/A');
      const validScores = subStrategyEvals.map(e => evaluationToScore[e]).filter(s => s > 0);
      if (validScores.length > 0) {
        totalScore = validScores.reduce((sum, score) => sum + score, 0);
        count = validScores.length;
      }
    } else if (conceptChecklists.level === 'Detailed') {
      let guidelineScores: number[] = [];
      strategy.subStrategies.forEach(subStrategy => {
        subStrategy.guidelines.forEach(guideline => {
          const evalLevel = conceptChecklists.guidelines[guideline.id] || 'N/A';
          const score = evaluationToScore[evalLevel];
          if (score > 0) {
            guidelineScores.push(score);
          }
        });
      });
      if (guidelineScores.length > 0) {
        totalScore = guidelineScores.reduce((sum, score) => sum + score, 0);
        count = guidelineScores.length;
      }
    }

    return count > 0 ? totalScore / count : 0;
  };

  useEffect(() => {
    const newRadarDataA: { [key: string]: number } = {};
    const newRadarDataB: { [key: string]: number } = {};

    strategies.forEach(strategy => {
      newRadarDataA[strategy.id] = calculateStrategyAverage('A', strategy.id);
      newRadarDataB[strategy.id] = calculateStrategyAverage('B', strategy.id);
    });

    setRadarChartData({
      A: newRadarDataA,
      B: newRadarDataB,
    });
  }, [evaluationChecklists, strategies, setRadarChartData]);

  const data = strategies.map(strategy => ({
    strategyName: `${strategy.id}. ${strategy.name}`,
    A: radarChartData.A[strategy.id] || 0,
    B: radarChartData.B[strategy.id] || 0,
    fullMark: 4, // Max score for Excellent
  }));

  const handleInsightTextChange = (strategyId: string, newText: string) => {
    setRadarInsights(prev => ({
      ...prev,
      [strategyId]: newText,
    }));
  };

  // Define positions for the insight boxes around the radar chart
  // Parent container height: 800px
  // StrategyInsightBox height: h-48 (192px)
  // Margin between box 1 and radar: 32px
  // Radar chart container top: 192px (box 1 height) + 32px (margin) = 224px
  // Lower insight boxes (4 & 5) top: 70% of 800px = 560px. Middle: 560px + 192px/2 = 656px.
  // Radar chart container bottom should be at 656px.
  // Radar chart container height: 656px - 224px = 432px.
  // Radar chart width: 50% of 1280px = 640px.
  // Space on each side of radar: (1280 - 640) / 2 = 320px.
  // Insight box width: w-72 (288px).
  // Margin from radar edge to insight box: (320 - 288) / 2 = 16px.
  const insightBoxPositions: { [key: string]: React.CSSProperties } = {
    '1': { top: '0', left: '50%', transform: 'translateX(-50%)' }, // Top center
    '2': { top: '256px', left: 'calc(50% + 320px + 16px)' }, // 224px (radar top) + 32px (margin)
    '3': { top: '344px', left: 'calc(50% + 320px + 16px)' }, // 224px + 432/2 - 192/2 = 344px (vertically centered with radar)
    '4': { top: '464px', left: 'calc(50% + 320px + 16px)' }, // 224px + 432px (radar height) - 192px (box height) = 464px (aligned with radar bottom)
    '5': { top: '464px', right: 'calc(50% + 320px + 16px)' },
    '6': { top: '344px', right: 'calc(50% + 320px + 16px)' },
    '7': { top: '256px', right: 'calc(50% + 320px + 16px)' },
  };

  return (
    <div className="p-6 bg-white rounded-lg shadow-md relative min-h-[calc(100vh-200px)] font-roboto">
      <h2 className="text-3xl font-palanquin font-semibold text-app-header mb-6">Evaluation Radar</h2>
      <p className="text-app-body-text mb-4">
        This radar chart displays the pursuit level of each of the 7 strategies for Concept A and B,
        based on your evaluations in the "Evaluation Checklists" section. Use the text boxes to add insights for each strategy.
      </p>

      <div className="relative max-w-7xl mx-auto h-[800px]"> {/* Removed flex centering */}
        {strategies.length > 0 ? (
          <>
            {/* StrategyInsightBox for strategy 1 (fixed at top center) */}
            {strategies.find(s => s.id === '1') && (
              <StrategyInsightBox
                key="1"
                strategy={strategies.find(s => s.id === '1')!}
                priority={getStrategyPriorityForDisplay(strategies.find(s => s.id === '1')!, qualitativeEvaluation)}
                text={radarInsights['1'] || ''}
                onTextChange={handleInsightTextChange}
                className="absolute"
                style={insightBoxPositions['1']}
              />
            )}

            {/* ResponsiveContainer for RadarChart, wrapped in a positioning div */}
            <div
              className="absolute left-1/2 -translate-x-1/2"
              style={{
                top: 'calc(192px + 32px)', // Bottom of box 1 + 32px margin
                height: '432px', // Calculated height
                width: '50%', // 640px
              }}
            >
              <ResponsiveContainer width="100%" height="100%">
                <RadarChart cx="50%" cy="60%" outerRadius="80%" data={data}> {/* cy adjusted to 60% */}
                  <PolarGrid stroke="#e0e0e0" />
                  <PolarAngleAxis tick={false} />
                  <PolarRadiusAxis
                    angle={90}
                    domain={[0, 4]}
                    tickCount={5}
                    stroke="#333"
                    tick={CustomRadiusTick}
                  />
                  <Radar name="Concept A" dataKey="A" stroke="var(--app-concept-a-dark)" fill="var(--app-concept-a-light)" fillOpacity={0.6} />
                  <Radar name="Concept B" dataKey="B" stroke="var(--app-concept-b-dark)" fill="var(--app-concept-b-light)" fillOpacity={0.6} />
                  <Legend />
                </RadarChart>
              </ResponsiveContainer>
            </div>

            {/* Render other StrategyInsightBoxes */}
            {strategies.filter(s => s.id !== '1').map(strategy => {
              const priority = getStrategyPriorityForDisplay(strategy, qualitativeEvaluation);
              const positionStyle = insightBoxPositions[strategy.id] || {};

              return (
                <StrategyInsightBox
                  key={strategy.id}
                  strategy={strategy}
                  priority={priority}
                  text={radarInsights[strategy.id] || ''}
                  onTextChange={handleInsightTextChange}
                  className="absolute"
                  style={positionStyle}
                />
              );
            })}
          </>
        ) : (
          <p className="text-app-body-text">Loading strategies...</p>
        )}
      </div>

      <WipeContentButton sectionKey="radarChart" />
    </div>
  );
};

export default EvaluationRadar;