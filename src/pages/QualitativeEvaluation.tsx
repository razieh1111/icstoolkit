"use client";

import React, { useState, useEffect } from 'react';
import WipeContentButton from '@/components/WipeContentButton';
import { useLcd } from '@/context/LcdContext';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { PriorityLevel } from '@/types/lcd';
import { getStrategyPriorityForDisplay, getPriorityTagClasses } from '@/utils/lcdUtils';
import { cn } from '@/lib/utils';
import { parseGuidingQuestions } from '@/utils/questionParser';

const QualitativeEvaluation: React.FC = () => {
  const { strategies, qualitativeEvaluation, setQualitativeEvaluation } = useLcd();
  const [guidingQuestions, setGuidingQuestions] = useState<Record<string, string[]>>({});

  useEffect(() => {
    const loadGuidingQuestions = async () => {
      const parsedQuestions = await parseGuidingQuestions('/LCD-strategies-questions.txt');
      setGuidingQuestions(parsedQuestions);
    };
    loadGuidingQuestions();
  }, []);

  const handlePriorityChange = (strategyId: string, subStrategyId: string, value: PriorityLevel) => {
    setQualitativeEvaluation(prev => {
      const newEvaluation = { ...prev };
      if (!newEvaluation[strategyId]) {
        newEvaluation[strategyId] = { priority: 'None', subStrategies: {} };
      }
      if (!newEvaluation[strategyId].subStrategies[subStrategyId]) {
        newEvaluation[strategyId].subStrategies[subStrategyId] = { priority: 'None', answer: '' };
      }
      newEvaluation[strategyId].subStrategies[subStrategyId].priority = value;
      return newEvaluation;
    });
  };

  const handleAnswerChange = (strategyId: string, subStrategyId: string, value: string) => {
    setQualitativeEvaluation(prev => {
      const newEvaluation = { ...prev };
      if (!newEvaluation[strategyId]) {
        newEvaluation[strategyId] = { priority: 'None', subStrategies: {} };
      }
      if (!newEvaluation[strategyId].subStrategies[subStrategyId]) {
        newEvaluation[strategyId].subStrategies[subStrategyId] = { priority: 'None', answer: '' };
      }
      newEvaluation[strategyId].subStrategies[subStrategyId].answer = value;
      return newEvaluation;
    });
  };

  // Define priority order for comparison
  const priorityOrder: Record<PriorityLevel, number> = {
    'None': 0,
    'Low': 1,
    'Mid': 2,
    'High': 3,
  };

  // Function to calculate the highest priority among sub-strategies for a given strategy
  const calculateHighestSubStrategyPriority = (currentStrategyId: string): PriorityLevel => {
    const currentStrategy = strategies.find(s => s.id === currentStrategyId);
    if (!currentStrategy) return 'None';

    let highestPriority: PriorityLevel = 'None';
    let highestScore = 0;

    // Iterate through all sub-strategies of the current strategy
    currentStrategy.subStrategies.forEach(ss => {
      const subPriority = qualitativeEvaluation[currentStrategyId]?.subStrategies[ss.id]?.priority || 'None';
      const subScore = priorityOrder[subPriority];

      if (subScore > highestScore) {
        highestScore = subScore;
        highestPriority = subPriority;
      }
    });
    return highestPriority;
  };

  const allStrategies = strategies;

  return (
    <div className="p-6 bg-white rounded-lg shadow-md relative min-h-[calc(100vh-200px)] font-roboto">
      <h2 className="text-3xl font-palanquin font-semibold text-app-header mb-6">Qualitative Evaluation of Existing Products/Systems and Strategic Priorities</h2>
      <p className="text-app-body-text mb-8">
        Define the priority level for each LCD strategy and sub-strategy, and answer guiding questions to elaborate on your choices.
      </p>

      <Tabs defaultValue={allStrategies[0]?.id || "no-strategies"} className="w-full">
        <TabsList className="grid w-full grid-cols-2 md:grid-cols-4 lg:grid-cols-7 h-auto p-2 items-stretch">
          {allStrategies.map((strategy) => {
            const { displayText, classes } = getPriorityTagClasses(getStrategyPriorityForDisplay(strategy, qualitativeEvaluation));
            return (
              <TabsTrigger
                key={strategy.id}
                value={strategy.id}
                className={cn(
                  "whitespace-normal h-auto font-roboto-condensed flex flex-col items-center justify-center text-center relative pt-3 pb-5",
                )}
              >
                <span className="mb-1">
                  {strategy.id}. {strategy.name}
                </span>
                <span className={cn(
                  "absolute bottom-1.5 text-xs font-roboto-condensed px-1 rounded-sm",
                  classes
                )}>
                  {displayText}
                </span>
              </TabsTrigger>
            );
          })}
        </TabsList>
        {allStrategies.map((strategy) => (
          <TabsContent key={strategy.id} value={strategy.id} className="mt-6 pt-4">
            <div className="flex justify-between items-center mb-8">
              <h3 className="text-2xl font-palanquin font-semibold text-app-header">
                {strategy.id}. {strategy.name}
              </h3>
              <div className="flex items-center gap-4">
                <Label htmlFor={`strategy-priority-${strategy.id}`} className="text-app-body-text">Strategy Priority:</Label>
                {['1', '2', '3', '4', '7'].includes(strategy.id) ? ( // Strategies 1,2,3,4,7 have calculated priority
                  <Select
                    value={calculateHighestSubStrategyPriority(strategy.id)}
                  >
                    <SelectTrigger id={`strategy-priority-${strategy.id}`} className="w-[180px]" disabled>
                      <SelectValue placeholder="Calculated Priority" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="High">High priority</SelectItem>
                      <SelectItem value="Mid">Mid priority</SelectItem>
                      <SelectItem value="Low">Low priority</SelectItem>
                      <SelectItem value="None">No priority</SelectItem>
                    </SelectContent>
                  </Select>
                ) : ( // Strategies 5, 6 have directly editable priority
                  <Select
                    value={qualitativeEvaluation[strategy.id]?.priority || 'None'}
                    onValueChange={(value: PriorityLevel) => setQualitativeEvaluation(prev => ({
                      ...prev,
                      [strategy.id]: { ...prev[strategy.id], priority: value }
                    }))}
                  >
                    <SelectTrigger id={`strategy-priority-${strategy.id}`} className="w-[180px]">
                      <SelectValue placeholder="Select Priority" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="High">High priority</SelectItem>
                      <SelectItem value="Mid">Mid priority</SelectItem>
                      <SelectItem value="Low">Low priority</SelectItem>
                      <SelectItem value="None">No priority</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              </div>
            </div>

            {/* Sub-strategies section */}
            <div className="space-y-8">
              {strategy.subStrategies.map((subStrategy) => {
                const questions = guidingQuestions[subStrategy.id] || [];
                return (
                  <div key={subStrategy.id} className="border-t pt-6 first:border-t-0 first:pt-0">
                    <div className="flex justify-between items-center mb-4">
                      <h4 className="text-xl font-palanquin font-medium text-app-header">
                        {subStrategy.id}. {subStrategy.name}
                      </h4>
                      <div className="flex items-center gap-4">
                        <Label htmlFor={`sub-strategy-priority-${subStrategy.id}`} className="text-app-body-text">
                          Sub-strategy Priority:
                        </Label>
                        <Select
                          value={qualitativeEvaluation[strategy.id]?.subStrategies[subStrategy.id]?.priority || 'None'}
                          onValueChange={(value: PriorityLevel) => handlePriorityChange(strategy.id, subStrategy.id, value)}
                        >
                          <SelectTrigger id={`sub-strategy-priority-${subStrategy.id}`} className="w-[180px]">
                            <SelectValue placeholder="Select Priority" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="High">High priority</SelectItem>
                            <SelectItem value="Mid">Mid priority</SelectItem>
                            <SelectItem value="Low">Low priority</SelectItem>
                            <SelectItem value="None">No priority</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="bg-orange-50 p-4 rounded-md border border-orange-200">
                        <ul className="list-disc list-inside text-app-body-text text-sm space-y-1">
                          {questions.length > 0 ? (
                            questions.map((q, idx) => (
                              <li key={idx}>{q}</li>
                            ))
                          ) : (
                            <li>No guiding questions available for this sub-strategy.</li>
                          )}
                        </ul>
                      </div>
                      <div className="flex-1">
                        <Textarea
                          placeholder={`Write your answers for "${subStrategy.name}" here...`}
                          rows={6}
                          className="w-full min-h-[150px]"
                          value={qualitativeEvaluation[strategy.id]?.subStrategies[subStrategy.id]?.answer || ''}
                          onChange={(e) => handleAnswerChange(strategy.id, subStrategy.id, e.target.value)}
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </TabsContent>
        ))}
      </Tabs>

      <WipeContentButton sectionKey="qualitativeEvaluation" />
    </div>
  );
};

export default QualitativeEvaluation;