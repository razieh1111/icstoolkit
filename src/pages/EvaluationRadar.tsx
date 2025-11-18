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

  // Define the desired order for strategies in the left and right columns
  const leftColumnStrategyIds = ['5', '6', '7'];
  // Strategy 1 is now moved above the radar, so it's removed from this list
  const rightColumnStrategyIds = ['2', '3', '4']; 

  const leftColumnStrategies = leftColumnStrategyIds
    .map(id => strategies.find(s => s.id === id))
    .filter((s): s is Strategy => s !== undefined);

  const rightColumnStrategies = rightColumnStrategyIds
    .map(id => strategies.find(s => s.id === id))
    .filter((s): s is Strategy => s !== undefined);

  // Find Strategy 1 specifically for positioning above the radar
  const strategy1 = strategies.find(s => s.id === '1');
  const strategy1Priority = strategy1 ? getStrategyPriorityForDisplay(strategy1, qualitativeEvaluation) : undefined;

  return (
    <div className="p-6 bg-white rounded-lg shadow-md relative min-h-[calc(100vh-200px)] font-roboto flex flex-col">
      <h2 className="text-3xl font-palanquin font-semibold text-app-header mb-6">Evaluation Radar</h2>
      <p className="text-app-body-text mb-4">
        This radar chart displays the pursuit level of each of the 7 strategies for Concept A and B,
        based on your evaluations in the "Evaluation Checklists" section. Use the text boxes to add insights for each strategy.
      </p>

      {/* Strategy 1 Insight Box - positioned above the radar */}
      {strategy1 && strategy1Priority && (
        <div className="w-72 mx-auto mb-px"> {/* Centered with mx-auto, 1px bottom margin with mb-px */}
          <StrategyInsightBox
            key={strategy1.id}
            strategy={strategy1}
            priority={strategy1Priority}
            text={radarInsights[strategy1.id] || ''}
            onTextChange={handleInsightTextChange}
          />
        </div>
      )}

      {/* This div uses flex-grow to push the radar section to the bottom */}
      <div className="flex-grow flex items-end justify-center w-full">
        {strategies.length > 0 ? (
          <div className="w-full max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-[1fr_2fr_1fr] gap-8 lg:gap-8 items-center lg:items-start">
            {/* Left Column for Insights (on large screens) */}
            <div className="hidden lg:flex flex-col gap-4 justify-center items-end h-full">
              {leftColumnStrategies.map(strategy => {
                const priority = getStrategyPriorityForDisplay(strategy, qualitativeEvaluation);
                return (
                  <StrategyInsightBox
                    key={strategy.id}
                    strategy={strategy}
                    priority={priority}
                    text={radarInsights[strategy.id] || ''}
                    onTextChange={handleInsightTextChange}
                  />
                );
              })}
            </div>

            {/* Radar Chart (centered) */}
            <div className="w-full h-[600px] lg:h-[800px] flex items-center justify-center">
              <ResponsiveContainer width="100%" height="100%">
                <RadarChart cx="50%" cy="50%" outerRadius="80%" data={data}>
                  <PolarGrid stroke="#e0e0e0" />
                  <PolarAngleAxis dataKey="strategyName" tick={{ fill: '#333', fontSize: 12, fontFamily: 'Roboto' }} />
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

            {/* Right Column for Insights (on large screens) */}
            <div className="hidden lg:flex flex-col gap-4 justify-center items-start h-full">
              {rightColumnStrategies.map(strategy => {
                const priority = getStrategyPriorityForDisplay(strategy, qualitativeEvaluation);
                // Removed custom marginTop for Strategy 2 as Strategy 1 is no longer directly above it
                return (
                  <StrategyInsightBox
                    key={strategy.id}
                    strategy={strategy}
                    priority={priority}
                    text={radarInsights[strategy.id] || ''}
                    onTextChange={handleInsightTextChange}
                    marginTop={undefined} // Explicitly set to undefined or remove prop
                  />
                );
              })}
            </div>

            {/* Stacked Insights for Small Screens (below lg) */}
            {/* Note: On small screens, insights are sorted numerically by strategy ID for consistency. */}
            <div className="lg:hidden flex flex-col gap-4 w-full mt-8">
              {[...leftColumnStrategies, ...rightColumnStrategies, strategy1].filter((s): s is Strategy => s !== undefined).sort((a, b) => parseInt(a.id) - parseInt(b.id)).map(strategy => {
                const priority = getStrategyPriorityForDisplay(strategy, qualitativeEvaluation);
                return (
                  <StrategyInsightBox
                    key={strategy.id}
                    strategy={strategy}
                    priority={priority}
                    text={radarInsights[strategy.id] || ''}
                    onTextChange={handleInsightTextChange}
                  />
                );
              })}
            </div>
          </div>
        ) : (
          <p className="text-app-body-text text-center">Loading strategies...</p>
        )}
      </div>

      <WipeContentButton sectionKey="radarChart" />
    </div>
  );
};

export default EvaluationRadar;