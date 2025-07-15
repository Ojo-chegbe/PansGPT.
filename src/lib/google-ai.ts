import { GoogleGenerativeAI, GenerativeModel } from '@google/generative-ai';

// Initialize the Google AI client
export const initGoogleAI = (apiKey: string) => {
  if (!apiKey) {
    throw new Error('Google AI API key is required');
  }
  
  return new GoogleGenerativeAI(apiKey);
};

// Function to get the Gemma model
export const getGemmaModel = (apiKey: string): GenerativeModel => {
  const genAI = initGoogleAI(apiKey);
  return genAI.getGenerativeModel({ model: 'gemma-3-27b-it' });
};

// Types for chat messages
export interface ChatMessage {
  role: 'user' | 'system' | 'model';
  content: string;
  hasContext?: boolean;
}

// Generation config type
type GenerationConfig = {
  temperature?: number;
  topK?: number;
  topP?: number;
  maxOutputTokens?: number;
};

// Function to generate chat response
export async function generateChatResponse(
  apiKey: string,
  messages: ChatMessage[],
  config: GenerationConfig = {}
): Promise<string> {
  if (!apiKey) throw new Error('Google AI API key is required');
  
  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({ model: 'gemma-3-27b-it' });

  // Extract system message if present
  const systemMessage = messages.find(msg => msg.role === 'system');
  const userMessages = messages.filter(msg => msg.role !== 'system');

  // Ensure first message is from user
  if (userMessages.length === 0) {
    throw new Error('At least one user message is required');
  }

  // Combine system message with first user message if present
  if (systemMessage) {
    userMessages[0] = {
      role: 'user',
      content: `${systemMessage.content}\n\nUser: ${userMessages[0].content}`
    };
  }

  // Convert messages for Google AI
  const convertedMessages = userMessages.map(msg => ({
    role: msg.role === 'model' ? 'model' : 'user',
    parts: [{ text: msg.content }]
  }));

  const chat = model.startChat({
    history: convertedMessages.slice(0, -1), // Exclude last message
    generationConfig: {
      temperature: 0.7,
      topK: 40,
      topP: 0.95,
      maxOutputTokens: 4096, // Increased for complete responses
      ...config,
    },
  });

  // Send the last message to get response
  const result = await chat.sendMessage(userMessages[userMessages.length - 1].content);
  const response = await result.response;
  const responseText = response.text();
  
  // Validate response completeness
  if (!responseText || responseText.trim().length === 0) {
    throw new Error('AI returned empty response');
  }
  
  return responseText;
} 

// Streaming version of chat response
type StreamCallback = (chunk: string) => void;

export async function streamChatResponse(
  apiKey: string,
  messages: ChatMessage[],
  config: GenerationConfig = {},
  onChunk: StreamCallback
): Promise<void> {
  if (!apiKey) throw new Error('Google AI API key is required');

  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({ model: 'gemma-3-27b-it' });

  // Extract system message if present
  const systemMessage = messages.find(msg => msg.role === 'system');
  const userMessages = messages.filter(msg => msg.role !== 'system');

  // Ensure first message is from user
  if (userMessages.length === 0) {
    throw new Error('At least one user message is required');
  }

  // Combine system message with first user message if present
  if (systemMessage) {
    userMessages[0] = {
      role: 'user',
      content: `${systemMessage.content}\n\nUser: ${userMessages[0].content}`
    };
  }

  // Convert messages for Google AI
  const convertedMessages = userMessages.map(msg => ({
    role: msg.role === 'model' ? 'model' : 'user',
    parts: [{ text: msg.content }]
  }));

  const chat = model.startChat({
    history: convertedMessages.slice(0, -1),
    generationConfig: {
      temperature: 0.7,
      topK: 40,
      topP: 0.95,
      maxOutputTokens: 4096,
      ...config,
    },
  });

  // Stream the last message
  const streamResult = await chat.sendMessageStream(userMessages[userMessages.length - 1].content);
  for await (const chunk of streamResult.stream) {
    const text = chunk.candidates?.[0]?.content?.parts?.[0]?.text;
    if (text) {
      onChunk(text);
    }
  }
} 