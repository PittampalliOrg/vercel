import { openai } from '@ai-sdk/openai';
import { createAzure, azure } from '@ai-sdk/azure';
import { anthropic } from '@ai-sdk/anthropic';
import { fireworks } from '@ai-sdk/fireworks';
import {
  customProvider,
  extractReasoningMiddleware,
  LanguageModelV1,
  wrapLanguageModel,
} from 'ai';
import { wrap } from 'module';

export const DEFAULT_CHAT_MODEL: string = 'chat-model-small';


export const myProvider = customProvider({
  languageModels: {
    'chat-model-small': openai('gpt-4o-mini'),
    'chat-model-large': azure("gpt-4o") as LanguageModelV1,
    'chat-model-reasoning': wrapLanguageModel({
      model: anthropic('claude-3-7-sonnet-20250219') as LanguageModelV1,
      middleware: extractReasoningMiddleware({ tagName: 'think' }),
    }),
    'title-model': openai('gpt-4-turbo'),
    'artifact-model': openai('gpt-4o-mini'),
  },
  imageModels: {
    'small-model': openai.image('dall-e-2'),
    'large-model': openai.image('dall-e-3'),
  },
});

interface ChatModel {
  id: string;
  name: string;
  description: string;
}

export const chatModels: Array<ChatModel> = [
  {
    id: 'chat-model-small',
    name: 'Small model',
    description: 'Small model for fast, lightweight tasks',
  },
  {
    id: 'chat-model-large',
    name: 'Large model',
    description: 'Large model for complex, multi-step tasks',
  },
  {
    id: 'chat-model-reasoning',
    name: 'Reasoning model',
    description: 'Uses advanced reasoning',
  },
];
