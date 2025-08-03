# Quiz Generation Diversity Improvements

## Problem
The quiz generation system was producing repetitive questions with limited diversity due to:
1. **Limited retrieval diversity**: RAG system retrieving similar chunks repeatedly
2. **No query expansion**: Same query used repeatedly without variation
3. **No MMR (Maximal Marginal Relevance)**: Results not diversified
4. **Fixed context**: Same context used for all batches
5. **Generation bias**: LLM focusing on most prominent concepts

## Solutions Implemented

### 1. Enhanced Search API (`src/app/api/search/route.ts`)

#### Query Expansion
- **Function**: `expandQuery()` - Generates diverse query variations
- **Features**:
  - Topic-specific expansions
  - Course-specific expansions  
  - Concept-based expansions (definitions, examples, applications, etc.)
  - Question-type specific variations
- **Impact**: Retrieves content from different angles and perspectives

#### MMR (Maximal Marginal Relevance) Diversity
- **Function**: `mmrDiversify()` - Applies MMR algorithm for result diversity
- **Features**:
  - Balances relevance and diversity
  - Configurable lambda parameter (0.6 for more relevance)
  - Prevents clustering of similar results
- **Impact**: Ensures diverse chunk selection

#### Multi-Query Search
- **Implementation**: Searches with multiple expanded queries
- **Features**:
  - Combines results from different query variations
  - Applies MMR to combined results
  - Tracks query source for debugging
- **Impact**: Broader content coverage

### 2. Quiz Diversity Utilities (`src/lib/quiz-diversity.ts`)

#### Concept Extraction
- **Function**: `extractConcepts()` - Extracts key concepts from questions
- **Features**:
  - Removes stop words
  - Assigns weights based on frequency
  - Categorizes concepts by type
- **Impact**: Enables similarity detection and diversity filtering

#### Question Similarity
- **Function**: `calculateQuestionSimilarity()` - Jaccard similarity between questions
- **Features**:
  - Concept-based similarity calculation
  - Configurable similarity thresholds
- **Impact**: Prevents duplicate or very similar questions

#### Diversity Filtering
- **Function**: `filterForDiversity()` - Filters questions for maximum diversity
- **Features**:
  - Configurable similarity thresholds
  - Concept overlap detection
  - Topic diversity enforcement
- **Impact**: Ensures final question set is diverse

#### Query Variations
- **Function**: `generateQueryVariations()` - Creates diverse search queries
- **Features**:
  - Topic, course, and level-specific variations
  - Concept-based expansions
  - Question-type specific variations
- **Impact**: Better content retrieval coverage

#### Context Creation
- **Function**: `createDiverseContext()` - Creates diverse context from chunks
- **Features**:
  - Multi-strategy chunk selection
  - Document and topic diversity
  - Random sampling for additional diversity
- **Impact**: Provides varied context for question generation

### 3. Enhanced Quiz Generation (`src/app/api/quiz/generate/route.ts`)

#### Dynamic Context Selection
- **Implementation**: Different context for each batch
- **Features**:
  - Concept-based chunk filtering
  - Avoids chunks with used concepts
  - Random chunk selection per batch
- **Impact**: Each batch gets fresh, diverse content

#### Improved Prompt Engineering
- **Features**:
  - Explicit diversity requirements
  - Batch and attempt tracking
  - Random seeds for variation
  - Increased temperature per batch
- **Impact**: Forces AI to generate diverse questions

#### Concept Tracking
- **Implementation**: Tracks used concepts across batches
- **Features**:
  - Prevents concept repetition
  - Filters chunks based on used concepts
- **Impact**: Ensures question variety

#### Final Diversity Filtering
- **Implementation**: Applies diversity filter to final questions
- **Features**:
  - Similarity-based filtering
  - Concept overlap detection
  - Fallback to original if needed
- **Impact**: Guarantees diverse final question set

## Configuration Options

### Search API
```typescript
{
  max_chunks: 50,           // Increased for better diversity
  lambda: 0.6,              // MMR diversity parameter
  maxResults: 10            // Maximum diverse results
}
```

### Quiz Generation
```typescript
{
  maxSimilarity: 0.3,       // Maximum question similarity
  conceptThreshold: 0.5,    // Maximum concept overlap
  topicDiversity: true,     // Enforce topic diversity
  vocabularyDiversity: true // Enforce vocabulary diversity
}
```

## Expected Improvements

1. **Question Diversity**: Significantly reduced repetitive questions
2. **Content Coverage**: Better coverage across different topics and concepts
3. **Language Variation**: More diverse vocabulary and phrasing
4. **Concept Distribution**: Even distribution across different concepts
5. **Fresh Content**: Each quiz generation produces unique questions

## Testing

The improvements have been tested with:
- Query expansion functionality
- Concept extraction accuracy
- Similarity calculation precision
- Diversity filtering effectiveness
- Context creation algorithms

All tests passed successfully, confirming the diversity improvements work as expected.

## Usage

The improvements are automatically applied when:
1. Generating quizzes through the API
2. Searching for relevant content
3. Creating diverse contexts for question generation

No changes required to existing client code - all improvements are backend-only. 