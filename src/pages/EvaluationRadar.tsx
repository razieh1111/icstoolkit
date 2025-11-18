"use client";

import React, { useEffect, useState, useRef, useCallback } from 'react';
import WipeContentButton from '@/components/WipeContentButton';
import { useLcd } from '@/context/LcdContext';
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer, Legend } from 'recharts';
import { EvaluationLevel } from '@/types/lcd';
import StrategyInsightBox from '@/components/StrategyInsightBox';
import { getStrategyPriorityForDisplay } from '@/utils/lcdUtils';
import SvgArrowOverlay from '@/components/SvgArrowOverlay'; // Import the new component

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

  // Refs for insight boxes and the radar chart's SVG element
  const insightBoxRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const radarChartWrapperRef = useRef<HTMLDivElement>(null);
  const radarSvgRef = useRef<SVGSVGElement | null>(null);

  // State to store radar label positions (SVG-relative) and calculated arrows (screen-relative)
  const [radarLabelSvgPositions, setRadarLabelSvgPositions] = useState<Record<string, { x: number; y: number }>>({});
  const [arrows, setArrows] = useState<{ start: { x: number; y: number }; end: { x: number; y: number } }[]>([]);

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

  // Custom Tick component for PolarAngleAxis to capture label positions
  const CustomAngleAxisTick = useCallback(({ x, y, payload }: any) => {
    const strategyId = payload.value.split('.')[0]; // Extract '1' from '1. Strategy Name'
    
    useEffect(() => {
      setRadarLabelSvgPositions(prev => ({
        ...prev,
        [strategyId]: { x, y },
      }));
    }, [x, y, strategyId]);

    return (
      <g transform={`translate(${x},${y})`}>
        <text x={0} y={0} dy={4} textAnchor="middle" fill="#333" fontSize={12} fontFamily="Roboto">
          {payload.value}
        </text>
      </g>
    );
  }, []); // No dependencies, as it only captures its own props

  // Effect to get the actual SVG element from ResponsiveContainer
  useEffect(() => {
    if (radarChartWrapperRef.current) {
      radarSvgRef.current = radarChartWrapperRef.current.querySelector('svg');
    }
  }, [radarChartWrapperRef.current]);

  // Effect to calculate and update arrows
  useEffect(() => {
    const calculateArrows = () => {
      const newArrows: { start: { x: number; y: number }; end: { x: number; y: number } }[] = [];
      const radarSvgRect = radarSvgRef.current?.getBoundingClientRect();

      if (!radarSvgRect) return;

      strategies.forEach(strategy => {
        const insightBoxElement = insightBoxRefs.current[strategy.id];
        const radarLabelSvgCoords = radarLabelSvgPositions[strategy.id];

        if (insightBoxElement && radarLabelSvgCoords) {
          const insightBoxRect = insightBoxElement.getBoundingClientRect();

          let startX, startY, endX, endY;

          // Convert radar label SVG coordinates to screen coordinates
          const radarLabelScreenX = radarSvgRect.left + radarLabelSvgCoords.x;
          const radarLabelScreenY = radarSvgRect.top + radarLabelSvgCoords.y;

          // Determine connection points based on strategy ID for better visual flow
          if (strategy.id === '1') {
            // Strategy 1: Box above, connect from bottom-center of box to top-center of label
            startX = insightBoxRect.left + insightBoxRect.width / 2;
            startY = insightBoxRect.bottom;
            endX = radarLabelScreenX;
            endY = radarLabelScreenY - 5; // Slightly above the text
          } else if (['2', '3', '4'].includes(strategy.id)) {
            // Strategies 2,3,4: Boxes on right, connect from left-center of box to right-center of label
            startX = insightBoxRect.left;
            startY = insightBoxRect.top + insightBoxRect.height / 2;
            endX = radarLabelScreenX + 5; // Slightly to the right of the text
            endY = radarLabelScreenY;
          } else if (['5', '6', '7'].includes(strategy.id)) {
            // Strategies 5,6,7: Boxes on left, connect from right-center of box to left-center of label
            startX = insightBoxRect.right;
            startY = insightBoxRect.top + insightBoxRect.height / 2;
            endX = radarLabelScreenX - 5; // Slightly to the left of the text
            endY = radarLabelScreenY;
          } else {
            // Fallback for other strategies
            startX = insightBoxRect.left + insightBoxRect.width / 2;
            startY = insightBoxRect.top + insightBoxRect.height / 2;
            endX = radarLabelScreenX;
            endY = radarLabelScreenY;
          }

          newArrows.push({ start: { x: startX, y: startY }, end: { x: endX, y: endY } });
        }
      });
      setArrows(newArrows);
    };

    // Recalculate on mount, resize, scroll, and when radarLabelSvgPositions or strategies change
    window.addEventListener('resize', calculateArrows);
    window.addEventListener('scroll', calculateArrows);
    calculateArrows(); // Initial calculation

    return () => {
      window.removeEventListener('resize', calculateArrows);
      window.removeEventListener('scroll', calculateArrows);
    };
  }, [strategies, radarLabelSvgPositions]); // Dependencies for useEffect

  // Define the desired order for strategies in the left and right columns
  const leftColumnStrategyIds = ['5', '6', '7'];
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

      {/* Container for S1 box and the main grid, allowing them to flow and center */}
      <div className="flex flex-col items-center w-full flex-grow">
        {/* Strategy 1 Insight Box - positioned above the radar */}
        {strategy1 && strategy1Priority && (
          <div className="w-72 mx-auto mb-4"> {/* Centered with mx-auto, added mb-4 for spacing */}
            <StrategyInsightBox
              key={strategy1.id}
              strategy={strategy1}
              priority={strategy1Priority}
              text={radarInsights[strategy1.id] || ''}
              onTextChange={handleInsightTextChange}
              ref={el => (insightBoxRefs.current[strategy1.id] = el)}
            />
          </div>
        )}

        <div className="w-full max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-[1fr_2fr_1fr] gap-8 lg:gap-8 items-center lg:items-center flex-grow"> {/* items-center for vertical alignment */}
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
                  ref={el => (insightBoxRefs.current[strategy.id] = el)}
                />
              );
            })}
          </div>

          {/* Radar Chart (centered) */}
          <div className="w-full h-[600px] lg:h-[800px] flex items-center justify-center" ref={radarChartWrapperRef}>
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart cx="50%" cy="50%" outerRadius="80%" data={data}>
                <PolarGrid stroke="#e0e0e0" />
                <PolarAngleAxis dataKey="strategyName" tick={CustomAngleAxisTick} /> {/* Use custom tick */}
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
              return (
                <StrategyInsightBox
                  key={strategy.id}
                  strategy={strategy}
                  priority={priority}
                  text={radarInsights[strategy.id] || ''}
                  onTextChange={handleInsightTextChange}
                  ref={el => (insightBoxRefs.current[strategy.id] = el)}
                  marginTop={undefined}
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
                  ref={el => (insightBoxRefs.current[strategy.id] = el)}
                />
              );
            })}
          </div>
        </div>
      </div>

      <WipeContentButton sectionKey="radarChart" />
      <SvgArrowOverlay arrows={arrows} /> {/* Render the arrow overlay */}
    </div>
  );
};

export default EvaluationRadar;