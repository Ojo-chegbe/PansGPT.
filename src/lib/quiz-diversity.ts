// Quiz diversity utilities to prevent repetitive questions

export interface DiversityConfig {
  maxSimilarity: number;
  conceptThreshold: number;
  topicDiversity: boolean;
  vocabularyDiversity: boolean;
}

export interface QuestionConcept {
  text: string;
  weight: number;
  type: 'topic' | 'concept' | 'term';
}

/**
 * Extract key concepts from question text
 */
export function extractConcepts(questionText: string): QuestionConcept[] {
  const concepts: QuestionConcept[] = [];
  
  // Simple concept extraction - can be enhanced with NLP
  const words = questionText.toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .split(/\s+/)
    .filter(word => word.length > 3);
  
  // Remove common stop words
  const stopWords = new Set([
    'what', 'which', 'when', 'where', 'why', 'how', 'the', 'and', 'or', 'but',
    'for', 'with', 'from', 'into', 'during', 'including', 'until', 'against',
    'among', 'throughout', 'despite', 'towards', 'upon', 'concerning', 'about',
    'this', 'that', 'these', 'those', 'will', 'would', 'could', 'should',
    'question', 'answer', 'correct', 'true', 'false', 'option', 'choice'
  ]);
  
  const filteredWords = words.filter(word => !stopWords.has(word));
  
  // Group similar words and assign weights
  const wordGroups: { [key: string]: number } = {};
  filteredWords.forEach(word => {
    if (!wordGroups[word]) wordGroups[word] = 0;
    wordGroups[word]++;
  });
  
  // Convert to concepts with weights
  Object.entries(wordGroups).forEach(([word, count]) => {
    concepts.push({
      text: word,
      weight: count,
      type: count > 1 ? 'concept' : 'term'
    });
  });
  
  return concepts.sort((a, b) => b.weight - a.weight);
}

/**
 * Calculate similarity between two questions
 */
export function calculateQuestionSimilarity(q1: string, q2: string): number {
  const concepts1 = extractConcepts(q1);
  const concepts2 = extractConcepts(q2);
  
  const set1 = new Set(concepts1.map(c => c.text));
  const set2 = new Set(concepts2.map(c => c.text));
  
  const intersection = new Set([...set1].filter(x => set2.has(x)));
  const union = new Set([...set1, ...set2]);
  
  return intersection.size / union.size; // Jaccard similarity
}

/**
 * Filter questions for diversity
 */
export function filterForDiversity(
  questions: any[],
  config: DiversityConfig = {
    maxSimilarity: 0.3,
    conceptThreshold: 0.5,
    topicDiversity: true,
    vocabularyDiversity: true
  }
): any[] {
  const diverseQuestions: any[] = [];
  const usedConcepts = new Set<string>();
  
  questions.forEach(question => {
    const questionText = question.questionText;
    let shouldInclude = true;
    
    // Check similarity with existing questions
    for (const existing of diverseQuestions) {
      const similarity = calculateQuestionSimilarity(questionText, existing.questionText);
      if (similarity > config.maxSimilarity) {
        shouldInclude = false;
        break;
      }
    }
    
    // Check concept overlap
    if (shouldInclude) {
      const concepts = extractConcepts(questionText);
      const conceptOverlap = concepts.filter(c => usedConcepts.has(c.text)).length;
      const overlapRatio = conceptOverlap / concepts.length;
      
      if (overlapRatio > config.conceptThreshold) {
        shouldInclude = false;
      }
    }
    
    if (shouldInclude) {
      diverseQuestions.push(question);
      
      // Track used concepts
      const concepts = extractConcepts(questionText);
      concepts.forEach(c => usedConcepts.add(c.text));
    }
  });
  
  return diverseQuestions;
}

/**
 * Generate diverse query variations
 */
export function generateQueryVariations(
  baseQuery: string,
  topic?: string,
  courseCode?: string,
  level?: string
): string[] {
  const variations = [baseQuery];
  
  // Topic-specific variations
  if (topic) {
    variations.push(`${baseQuery} ${topic}`);
    variations.push(`${topic} ${baseQuery}`);
    variations.push(`${baseQuery} concepts ${topic}`);
    variations.push(`${baseQuery} principles ${topic}`);
  }
  
  // Course-specific variations
  if (courseCode) {
    variations.push(`${baseQuery} ${courseCode}`);
    variations.push(`${courseCode} ${baseQuery}`);
    variations.push(`${baseQuery} course ${courseCode}`);
  }
  
  // Level-specific variations
  if (level) {
    variations.push(`${baseQuery} ${level} level`);
    variations.push(`${level} level ${baseQuery}`);
  }
  
  // Concept-based variations
  const conceptTypes = [
    'definitions', 'examples', 'applications', 'methods',
    'theories', 'principles', 'concepts', 'processes',
    'techniques', 'approaches', 'strategies'
  ];
  
  conceptTypes.forEach(concept => {
    variations.push(`${baseQuery} ${concept}`);
    if (topic) {
      variations.push(`${baseQuery} ${concept} ${topic}`);
    }
  });
  
  // Question-type specific variations
  const questionTypes = ['multiple choice', 'true false', 'short answer', 'objective'];
  questionTypes.forEach(type => {
    variations.push(`${baseQuery} ${type} questions`);
  });
  
  return [...new Set(variations)]; // Remove duplicates
}

/**
 * Create diverse context from chunks
 */
export function createDiverseContext(
  chunks: any[],
  maxChunks: number = 20
): string {
  if (chunks.length === 0) return '';
  
  // Group by document and topic
  const byDocument: { [key: string]: any[] } = {};
  const byTopic: { [key: string]: any[] } = {};
  
  chunks.forEach(chunk => {
    const docId = chunk.metadata?.document_id || 'unknown';
    const topic = chunk.metadata?.topic || 'general';
    
    if (!byDocument[docId]) byDocument[docId] = [];
    if (!byTopic[topic]) byTopic[topic] = [];
    
    byDocument[docId].push(chunk);
    byTopic[topic].push(chunk);
  });
  
  const selectedChunks: any[] = [];
  
  // Strategy 1: Take samples from each document
  Object.values(byDocument).forEach(docChunks => {
    docChunks.sort((a, b) => (a.metadata?.chunkIndex || 0) - (b.metadata?.chunkIndex || 0));
    
    // Take first, middle, and last chunks
    if (docChunks.length > 0) selectedChunks.push(docChunks[0]);
    if (docChunks.length > 2) selectedChunks.push(docChunks[Math.floor(docChunks.length / 2)]);
    if (docChunks.length > 1) selectedChunks.push(docChunks[docChunks.length - 1]);
  });
  
  // Strategy 2: Ensure topic diversity
  Object.values(byTopic).forEach(topicChunks => {
    if (topicChunks.length > 0) {
      const randomChunk = topicChunks[Math.floor(Math.random() * topicChunks.length)];
      if (!selectedChunks.some(chunk => chunk.chunk_text === randomChunk.chunk_text)) {
        selectedChunks.push(randomChunk);
      }
    }
  });
  
  // Strategy 3: Random sampling for additional diversity
  const remainingChunks = chunks.filter(chunk => 
    !selectedChunks.some(selected => selected.chunk_text === chunk.chunk_text)
  );
  
  if (remainingChunks.length > 0) {
    const randomSample = Math.min(5, remainingChunks.length);
    for (let i = 0; i < randomSample; i++) {
      const randomIndex = Math.floor(Math.random() * remainingChunks.length);
      selectedChunks.push(remainingChunks.splice(randomIndex, 1)[0]);
    }
  }
  
  // Limit and shuffle
  if (selectedChunks.length > maxChunks) {
    for (let i = selectedChunks.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [selectedChunks[i], selectedChunks[j]] = [selectedChunks[j], selectedChunks[i]];
    }
    selectedChunks.splice(maxChunks);
  }
  
  return selectedChunks.map(chunk => chunk.chunk_text).join('\n\n');
} 