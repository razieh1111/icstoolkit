"use client";

export async function parseGuidingQuestions(filePath: string): Promise<Record<string, string[]>> {
  try {
    const response = await fetch(filePath);
    if (!response.ok) {
      throw new Error(`Failed to fetch ${filePath}: ${response.statusText}`);
    }
    const text = await response.text();
    const lines = text.split('\n').map(line => line.trim()).filter(line => line.length > 0);

    const questionsMap: Record<string, string[]> = {};
    let currentSubStrategyId: string | null = null;

    lines.forEach(line => {
      // Check for a sub-strategy header, e.g., "## 1.1"
      const subStrategyMatch = line.match(/^##\s*(\d+\.\d+)/);
      if (subStrategyMatch) {
        currentSubStrategyId = subStrategyMatch[1];
        questionsMap[currentSubStrategyId] = [];
      } else if (currentSubStrategyId && line.startsWith('-')) {
        // If we are under a sub-strategy header and the line is a list item
        questionsMap[currentSubStrategyId].push(line.substring(1).trim());
      }
    });

    return questionsMap;
  } catch (error) {
    console.error("Error parsing guiding questions:", error);
    return {};
  }
}