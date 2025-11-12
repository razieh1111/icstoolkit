"use client";

import React, { useState } from 'react';
import WipeContentButton from '@/components/WipeContentButton';
import { useLcd } from '@/context/LcdContext';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea'; // Keeping imports for now, even if UI is removed
import { Button } from '@/components/ui/button'; // Keeping imports for now, even if UI is removed
import { PlusCircle, Trash2 } from 'lucide-react'; // Keeping imports for now, even if UI is removed
import { EcoIdea } from '@/types/lcd';
import { toast } from 'sonner';

const EcoIdeasBoards: React.FC = () => {
  const { strategies, ecoIdeas, setEcoIdeas } = useLcd();
  const [newIdeaText, setNewIdeaText] = useState(''); // Keeping state for potential future use
  const [selectedStrategyId, setSelectedStrategyId] = useState(strategies[0]?.id || '');

  React.useEffect(() => {
    if (strategies.length > 0 && !selectedStrategyId) {
      setSelectedStrategyId(strategies[0].id);
    }
  }, [strategies, selectedStrategyId]);

  // Keeping addIdea and deleteIdea functions, even if their UI is removed
  const addIdea = (strategyId: string, subStrategyId?: string, guidelineId?: string) => {
    if (newIdeaText.trim() === '') {
      toast.error("Idea cannot be empty.");
      return;
    }
    const newIdea: EcoIdea = {
      id: `idea-${Date.now()}`,
      text: newIdeaText,
      strategyId,
      subStrategyId,
      guidelineId,
    };
    setEcoIdeas(prev => [...prev, newIdea]);
    setNewIdeaText('');
    toast.success("Idea added!");
  };

  const deleteIdea = (id: string) => {
    setEcoIdeas(prev => prev.filter(idea => idea.id !== id));
    toast.info("Idea removed.");
  };

  // filteredIdeas is no longer used in the render, but keeping the variable for context
  // const filteredIdeas = ecoIdeas.filter(idea => idea.strategyId === selectedStrategyId);

  return (
    <div className="p-6 bg-white rounded-lg shadow-md relative min-h-[calc(100vh-200px)] font-roboto">
      <h2 className="text-3xl font-palanquin font-semibold text-app-header mb-6">Eco-Ideas Boards</h2>
      <p className="text-app-body-text mb-8">
        Brainstorm and create digital sticky notes with ideas inspired by the LCD strategies and guidelines.
      </p>

      <Tabs value={selectedStrategyId} onValueChange={setSelectedStrategyId} className="w-full">
        <TabsList className="grid w-full grid-cols-2 md:grid-cols-4 lg:grid-cols-7 h-auto p-2 items-stretch">
          {strategies.map((strategy) => (
            <TabsTrigger key={strategy.id} value={strategy.id} className="whitespace-normal h-auto font-roboto-condensed flex items-center justify-center text-center">
              {strategy.id}. {strategy.name}
            </TabsTrigger>
          ))}
        </TabsList>
        {strategies.map((strategy) => (
          <TabsContent key={strategy.id} value={strategy.id} className="mt-6 pt-4">
            <h3 className="text-2xl font-palanquin font-semibold text-app-header mb-4">{strategy.id}. {strategy.name}</h3>

            {/* The new "large blank canvas" area */}
            <div className="flex flex-col items-center justify-start min-h-[400px] p-8 border border-gray-200 rounded-lg bg-gray-50">
              <div className="w-full max-w-3xl text-center"> {/* Centrally aligned content */}
                {strategy.subStrategies.map((subStrategy) => (
                  <div key={subStrategy.id} className="mb-6">
                    <h4 className="text-xl font-palanquin font-semibold text-app-header mb-2">
                      {subStrategy.id}. {subStrategy.name}
                    </h4>
                    <ul className="list-none space-y-1">
                      {subStrategy.guidelines.map((guideline) => (
                        <li key={guideline.id} className="text-sm text-gray-600 font-roboto-condensed">
                          {guideline.name}
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </div>
          </TabsContent>
        ))}
      </Tabs>

      <WipeContentButton sectionKey="ecoIdeas" />
    </div>
  );
};

export default EcoIdeasBoards;