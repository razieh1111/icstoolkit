"use client";

import React, { useEffect, useState, useRef } from 'react';
import WipeContentButton from '@/components/WipeContentButton';
import { useLcd } from '@/context/LcdContext';
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer, Legend } from 'recharts';
import { EvaluationLevel } from '@/types/lcd';
import StrategyInsightBox from '@/components/StrategyInsightBox';
import { getStrategyPriorityForDisplay } from '@/utils/lcdUtils';

// Define the size of the insight boxes for positioning calculations
const INSIGHT_BOX_WIDTH = 288; // w-72
const INSIGHT_BOX_HEIGHT = 224; // h-56
const MARGIN_BETWEEN_RADAR_AND_BOX = 20; // Fixed margin in pixels

const EvaluationRadar: React.FC = () => {
  const { strategies, evaluationChecklists, setRadarChartData, radarChartData, qualitativeEvaluation, radarInsights, setRadarInsights } = useLcd();
  const [radarTickCoordinates, setRadarTickCoordinates] = useState<{ [key: string]: { x: number; y: number } }>({});
  const radarContainerRef = useRef<HTMLDivElement>(null);

  // Map EvaluationLevel to a numerical score for the radar chart
  const evaluationToScore: Record<EvaluationLevel, number> = {
    'Poor': 1,
    'Mediocre': 2,
    'Good': 3,
    'Excellent': 4,
    'N/A': 0,
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

  // Custom tick formatter to capture coordinates and hide labels
  const renderPolarAngleAxisTick = (props: any) => {
    const { x, y, payload } = props;
    const strategyId = payload.value.split('.')[0]; // Extract strategy ID from "1. Strategy Name"
    
    // Store the coordinates for drawing lines later
    setRadarTickCoordinates(prev => ({
      ...prev,
      [strategyId]: { x, y }
    }));

    return null; // Hide the actual tick label
  };

  // Calculate positions for the insight boxes
  const getInsightBoxPosition = (strategyId: string, radarCenterX: number, radarCenterY: number, outerRadius: number): React.CSSProperties => {
    const tick = radarTickCoordinates[strategyId];
    if (!tick) return {};

    // Calculate the angle of the strategy axis
    const angleRad = Math.atan2(tick.y - radarCenterY, tick.x - radarCenterX);

    // Calculate the point on the outer edge of the radar
    const radarEdgeX = radarCenterX + outerRadius * Math.cos(angleRad);
    const radarEdgeY = radarCenterY + outerRadius * Math.sin(angleRad);

    // Calculate the position for the insight box, adding a fixed margin
    let boxX = radarEdgeX + MARGIN_BETWEEN_RADAR_AND_BOX * Math.cos(angleRad);
    let boxY = radarEdgeY + MARGIN_BETWEEN_RADAR_AND_BOX * Math.sin(angleRad);

    // Adjust for box dimensions to center it relative to the axis direction
    // This is a simplified adjustment; more complex logic might be needed for perfect alignment
    boxX -= INSIGHT_BOX_WIDTH / 2;
    boxY -= INSIGHT_BOX_HEIGHT / 2;

    // Specific adjustments for each strategy to place them logically
    // Strategy 1 (top)
    if (strategyId === '1') {
      boxX = radarCenterX - INSIGHT_BOX_WIDTH / 2;
      boxY = radarCenterY - outerRadius - MARGIN_BETWEEN_RADAR_AND_BOX - INSIGHT_BOX_HEIGHT;
    }
    // Strategy 2 (top-right)
    else if (strategyId === '2') {
      boxX = radarCenterX + outerRadius + MARGIN_BETWEEN_RADAR_AND_BOX;
      boxY = radarCenterY - INSIGHT_BOX_HEIGHT / 2 - (outerRadius * 0.5); // Adjust vertically
    }
    // Strategy 3 (bottom-right)
    else if (strategyId === '3') {
      boxX = radarCenterX + outerRadius + MARGIN_BETWEEN_RADAR_AND_BOX;
      boxY = radarCenterY + INSIGHT_BOX_HEIGHT / 2 + (outerRadius * 0.5) - INSIGHT_BOX_HEIGHT; // Adjust vertically
    }
    // Strategy 4 (bottom)
    else if (strategyId === '4') {
      boxX = radarCenterX - INSIGHT_BOX_WIDTH / 2;
      boxY = radarCenterY + outerRadius + MARGIN_BETWEEN_RADAR_AND_BOX;
    }
    // Strategy 5 (bottom-left)
    else if (strategyId === '5') {
      boxX = radarCenterX - outerRadius - MARGIN_BETWEEN_RADAR_AND_BOX - INSIGHT_BOX_WIDTH;
      boxY = radarCenterY + INSIGHT_BOX_HEIGHT / 2 + (outerRadius * 0.5) - INSIGHT_BOX_HEIGHT; // Adjust vertically
    }
    // Strategy 6 (top-left)
    else if (strategyId === '6') {
      boxX = radarCenterX - outerRadius - MARGIN_BETWEEN_RADAR_AND_BOX - INSIGHT_BOX_WIDTH;
      boxY = radarCenterY - INSIGHT_BOX_HEIGHT / 2 - (outerRadius * 0.5); // Adjust vertically
    }
    // Strategy 7 (center-left, if it were on the radar)
    else if (strategyId === '7') {
      boxX = radarCenterX - outerRadius - MARGIN_BETWEEN_RADAR_AND_BOX - INSIGHT_BOX_WIDTH;
      boxY = radarCenterY - INSIGHT_BOX_HEIGHT / 2;
    }


    return {
      position: 'absolute',
      left: `${boxX}px`,
      top: `${boxY}px`,
    };
  };

  // Calculate line coordinates
  const getLineCoordinates = (strategyId: string, radarCenterX: number, radarCenterY: number, outerRadius: number) => {
    const tick = radarTickCoordinates[strategyId];
    if (!tick) return null;

    const angleRad = Math.atan2(tick.y - radarCenterY, tick.x - radarCenterX);

    const radarEdgeX = radarCenterX + outerRadius * Math.cos(angleRad);
    const radarEdgeY = radarCenterY + outerRadius * Math.sin(angleRad);

    // Calculate the start point of the line (just outside the radar)
    const lineStartX = radarCenterX + (outerRadius + 5) * Math.cos(angleRad);
    const lineStartY = radarCenterY + (outerRadius + 5) * Math.sin(angleRad);

    // Calculate the end point of the line (at the edge of the insight box)
    let lineEndX, lineEndY;

    // These coordinates need to match the *center* of the side of the box facing the radar
    // This is a simplified approach, more precise calculation would involve box corners
    const boxPosition = getInsightBoxPosition(strategyId, radarCenterX, radarCenterY, outerRadius);
    const boxLeft = parseFloat(boxPosition.left as string);
    const boxTop = parseFloat(boxPosition.top as string);

    // Determine which side of the box the line should connect to
    // This logic is simplified and assumes the box is generally "outward" from the radar
    if (strategyId === '1') { // Top
      lineEndX = boxLeft + INSIGHT_BOX_WIDTH / 2;
      lineEndY = boxTop + INSIGHT_BOX_HEIGHT;
    } else if (strategyId === '2' || strategyId === '3') { // Right
      lineEndX = boxLeft;
      lineEndY = boxTop + INSIGHT_BOX_HEIGHT / 2;
    } else if (strategyId === '4') { // Bottom
      lineEndX = boxLeft + INSIGHT_BOX_WIDTH / 2;
      lineEndY = boxTop;
    } else if (strategyId === '5' || strategyId === '6' || strategyId === '7') { // Left
      lineEndX = boxLeft + INSIGHT_BOX_WIDTH;
      lineEndY = boxTop + INSIGHT_BOX_HEIGHT / 2;
    } else {
      // Fallback if no specific logic
      lineEndX = boxLeft + INSIGHT_BOX_WIDTH / 2;
      lineEndY = boxTop + INSIGHT_BOX_HEIGHT / 2;
    }

    return { lineStartX, lineStartY, lineEndX, lineEndY };
  };


  return (
    <div className="p-6 bg-white rounded-lg shadow-md relative min-h-[calc(100vh-200px)] font-roboto">
      <h2 className="text-3xl font-palanquin font-semibold text-app-header mb-6">Evaluation Radar</h2>
      <p className="text-app-body-text mb-4">
        This radar chart displays the pursuit level of each of the 7 strategies for Concept A and B,
        based on your evaluations in the "Evaluation Checklists" section. Use the text boxes to add insights for each strategy.
      </p>

      <div ref={radarContainerRef} className="relative max-w-7xl mx-auto h-[800px] flex justify-center items-center">
        {strategies.length > 0 ? (
          <>
            <ResponsiveContainer width="50%" height="100%">
              <RadarChart cx="50%" cy="50%" outerRadius="80%" data={data}>
                <PolarGrid stroke="#e0e0e0" />
                <PolarAngleAxis
                  dataKey="strategyName"
                  tick={renderPolarAngleAxisTick} // Use custom tick renderer to hide labels and capture coords
                  stroke="#333"
                />
                <PolarRadiusAxis angle={90} domain={[0, 4]} tickCount={5} stroke="#333" tick={{ fill: '#333', fontSize: 10, fontFamily: 'Roboto' }} />
                <Radar name="Concept A" dataKey="A" stroke="var(--app-concept-a-dark)" fill="var(--app-concept-a-light)" fillOpacity={0.6} />
                <Radar name="Concept B" dataKey="B" stroke="var(--app-concept-b-dark)" fill="var(--app-concept-b-light)" fillOpacity={0.6} />
                <Legend />
              </RadarChart>
            </ResponsiveContainer>

            {/* Render StrategyInsightBoxes and connecting lines */}
            {radarContainerRef.current && strategies.map(strategy => {
              const priority = getStrategyPriorityForDisplay(strategy, qualitativeEvaluation);
              const radarRect = radarContainerRef.current!.getBoundingClientRect();
              const radarCenterX = radarRect.width / 2;
              const radarCenterY = radarRect.height / 2;
              const outerRadius = radarRect.height * 0.8 / 2; // 80% of half height, matching RadarChart's outerRadius="80%"

              const boxPositionStyle = getInsightBoxPosition(strategy.id, radarCenterX, radarCenterY, outerRadius);
              const lineCoords = getLineCoordinates(strategy.id, radarCenterX, radarCenterY, outerRadius);

              return (
                <React.Fragment key={strategy.id}>
                  <StrategyInsightBox
                    strategy={strategy}
                    priority={priority}
                    text={radarInsights[strategy.id] || ''}
                    onTextChange={handleInsightTextChange}
                    style={boxPositionStyle}
                  />
                  {lineCoords && (
                    <svg className="absolute inset-0 w-full h-full pointer-events-none">
                      <line
                        x1={lineCoords.lineStartX}
                        y1={lineCoords.lineStartY}
                        x2={lineCoords.lineEndX}
                        y2={lineCoords.lineEndY}
                        stroke="#888"
                        strokeWidth="1"
                      />
                    </svg>
                  )}
                </React.Fragment>
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