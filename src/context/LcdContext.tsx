"use client";

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import {
  Strategy,
  ProjectData,
  QualitativeEvaluationData,
  EcoIdea,
  EvaluationChecklistData,
  RadarChartData,
  RadarNotesData, // Imported new interface
  PriorityLevel,
  EvaluationLevel,
  ChecklistLevel,
  ConceptType,
} from '@/types/lcd';
import { parseLcdStrategies } from '@/utils/lcdParser';

interface LcdContextType {
  strategies: Strategy[];
  projectData: ProjectData;
  setProjectData: (data: ProjectData) => void;
  qualitativeEvaluation: QualitativeEvaluationData;
  setQualitativeEvaluation: (data: QualitativeEvaluationData) => void;
  ecoIdeas: EcoIdea[];
  setEcoIdeas: (ideas: EcoIdea[]) => void;
  evaluationChecklists: EvaluationChecklistData;
  setEvaluationChecklists: (data: EvaluationChecklistData) => void;
  radarChartData: RadarChartData;
  setRadarChartData: (data: RadarChartData) => void;
  radarNotes: RadarNotesData; // New: Radar notes state
  setRadarNotes: (data: RadarNotesData) => void; // New: Setter for radar notes
  resetSection: (section: string) => void;
  getStrategyById: (id: string) => Strategy | undefined;
  getSubStrategyById: (strategyId: string, subStrategyId: string) => SubStrategy | undefined;
  getGuidelineById: (subStrategyId: string, guidelineId: string) => Guideline | undefined;
}

const LcdContext = createContext<LcdContextType | undefined>(undefined);

const initialProjectData: ProjectData = {
  projectName: '',
  company: '',
  designer: '',
  functionalUnit: '',
  descriptionExistingProduct: '',
};

const initialQualitativeEvaluation: QualitativeEvaluationData = {};
const initialEcoIdeas: EcoIdea[] = [];
const initialEvaluationChecklists: EvaluationChecklistData = {
  A: { level: 'Simplified', strategies: {}, subStrategies: {}, guidelines: {} },
  B: { level: 'Simplified', strategies: {}, subStrategies: {}, guidelines: {} },
};
const initialRadarChartData: RadarChartData = {
  A: {},
  B: {},
};
const initialRadarNotes: RadarNotesData = {}; // New: Initial state for radar notes

export const LcdProvider = ({ children }: { children: ReactNode }) => {
  const [strategies, setStrategies] = useState<Strategy[]>([]);
  const [projectData, setProjectData] = useState<ProjectData>(initialProjectData);
  const [qualitativeEvaluation, setQualitativeEvaluation] = useState<QualitativeEvaluationData>(initialQualitativeEvaluation);
  const [ecoIdeas, setEcoIdeas] = useState<EcoIdea[]>(initialEcoIdeas);
  const [evaluationChecklists, setEvaluationChecklists] = useState<EvaluationChecklistData>(initialEvaluationChecklists);
  const [radarChartData, setRadarChartData] = useState<RadarChartData>(initialRadarChartData);
  const [radarNotes, setRadarNotes] = useState<RadarNotesData>(initialRadarNotes); // New: State for radar notes

  useEffect(() => {
    const loadStrategies = async () => {
      const parsedStrategies = await parseLcdStrategies('/LCD-strategies.txt');
      setStrategies(parsedStrategies);

      // Initialize qualitative evaluation, radar data, and radar notes based on parsed strategies
      const initialQualitative: QualitativeEvaluationData = {};
      const initialRadar: RadarChartData = { A: {}, B: {} };
      const initialNotes: RadarNotesData = {}; // Initialize notes
      parsedStrategies.forEach(strategy => {
        initialQualitative[strategy.id] = { priority: 'None', subStrategies: {} };
        strategy.subStrategies.forEach(sub => {
          initialQualitative[strategy.id].subStrategies[sub.id] = { priority: 'None', answer: '' }; // Initialize answer field
        });
        initialRadar.A[strategy.id] = 0; // Default to Poor
        initialRadar.B[strategy.id] = 0; // Default to Poor
        initialNotes[strategy.id] = ''; // Initialize empty note for each strategy
      });
      setQualitativeEvaluation(initialQualitative);
      setRadarChartData(initialRadar);
      setRadarNotes(initialNotes); // Set initial notes
    };
    loadStrategies();
  }, []);

  // Helper functions to get strategy/sub-strategy/guideline by ID
  const getStrategyById = (id: string) => strategies.find(s => s.id === id);
  const getSubStrategyById = (strategyId: string, subStrategyId: string) => {
    const strategy = getStrategyById(strategyId);
    return strategy?.subStrategies.find(ss => ss.id === subStrategyId);
  };
  const getGuidelineById = (subStrategyId: string, guidelineId: string) => {
    // This assumes guidelineId is unique across all guidelines, or at least within a sub-strategy
    // For now, let's find it by iterating through all sub-strategies
    for (const strategy of strategies) {
      for (const subStrategy of strategy.subStrategies) {
        if (subStrategy.id === subStrategyId) {
          return subStrategy.guidelines.find(g => g.id === guidelineId);
        }
      }
    }
    return undefined;
  };


  const resetSection = (section: string) => {
    switch (section) {
      case 'projectData':
        setProjectData(initialProjectData);
        break;
      case 'qualitativeEvaluation':
        const resetQualitative: QualitativeEvaluationData = {};
        strategies.forEach(strategy => {
          resetQualitative[strategy.id] = { priority: 'None', subStrategies: {} };
          strategy.subStrategies.forEach(sub => {
            resetQualitative[strategy.id].subStrategies[sub.id] = { priority: 'None', answer: '' }; // Reset answer field
          });
        });
        setQualitativeEvaluation(resetQualitative);
        break;
      case 'ecoIdeas':
        setEcoIdeas(initialEcoIdeas); // Resets to an empty array, clearing all notes
        break;
      case 'evaluationChecklists':
        setEvaluationChecklists(initialEvaluationChecklists);
        break;
      case 'radarChart':
        const resetRadar: RadarChartData = { A: {}, B: {} };
        const resetNotes: RadarNotesData = {}; // New: Reset notes
        strategies.forEach(strategy => {
          resetRadar.A[strategy.id] = 0;
          resetRadar.B[strategy.id] = 0;
          resetNotes[strategy.id] = ''; // New: Reset notes to empty
        });
        setRadarChartData(resetRadar);
        setRadarNotes(resetNotes); // New: Apply reset to notes
        break;
      default:
        console.warn(`Unknown section to reset: ${section}`);
    }
  };

  return (
    <LcdContext.Provider
      value={{
        strategies,
        projectData,
        setProjectData,
        qualitativeEvaluation,
        setQualitativeEvaluation,
        ecoIdeas,
        setEcoIdeas,
        evaluationChecklists,
        setEvaluationChecklists,
        radarChartData,
        setRadarChartData,
        radarNotes, // New: Provide radar notes
        setRadarNotes, // New: Provide setter for radar notes
        resetSection,
        getStrategyById,
        getSubStrategyById,
        getGuidelineById,
      }}
    >
      {children}
    </LcdContext.Provider>
  );
};

export const useLcd = () => {
  const context = useContext(LcdContext);
  if (context === undefined) {
    throw new Error('useLcd must be used within an LcdProvider');
  }
  return context;
};