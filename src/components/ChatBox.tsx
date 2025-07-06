import React, { useState, useEffect } from 'react';
import { generateChatResponse, type ChatMessage } from '../lib/google-ai';
import { ClipboardIcon, PencilIcon } from '@heroicons/react/24/outline';
import MarkdownWithMath from './MarkdownWithMath';

interface ChatBoxProps {
  apiKey: string;
}

export const ChatBox: React.FC<ChatBoxProps> = ({ apiKey }) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [editingMessageIndex, setEditingMessageIndex] = useState<number | null>(null);
  const [editText, setEditText] = useState('');

  // Add initial greeting when component mounts
  useEffect(() => {
    setMessages([
      {
        role: 'model',
        content: 'Hello! I am PansGPT, powered by Google\'s Gemma model. How can I assist you today?'
      }
    ]);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMessage: ChatMessage = {
      role: 'user',
      content: input.trim(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      const response = await generateChatResponse(apiKey, [...messages, userMessage]);
      setMessages(prev => [...prev, { role: 'model', content: response }]);
    } catch (error) {
      console.error('Error in chat:', error);
      setMessages(prev => [...prev, {
        role: 'model',
        content: 'I apologize, but I encountered an error. Please try again.'
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopy = async (content: string) => {
    try {
      await navigator.clipboard.writeText(content);
    } catch (err) {
      console.error('Failed to copy text:', err);
    }
  };

  const handleEdit = (index: number) => {
    if (messages[index].role === 'user') {
      setEditingMessageIndex(index);
      setEditText(messages[index].content);
    }
  };

  const handleSaveEdit = async (index: number) => {
    if (!editText.trim()) return;

    const updatedMessages = [...messages];
    updatedMessages[index] = {
      ...updatedMessages[index],
      content: editText.trim()
    };

    setMessages(updatedMessages);
    setEditingMessageIndex(null);
    setEditText('');

    // If it's not the last message, regenerate AI responses after it
    if (index < messages.length - 1) {
      setIsLoading(true);
      try {
        const messagesToKeep = updatedMessages.slice(0, index + 1);
        const response = await generateChatResponse(apiKey, messagesToKeep);
        setMessages([...messagesToKeep, { role: 'model', content: response }]);
      } catch (error) {
        console.error('Error regenerating response:', error);
      } finally {
        setIsLoading(false);
      }
    }
  };

  return (
    <div className="flex flex-col h-[600px] w-full max-w-2xl mx-auto bg-white rounded-lg shadow-lg">
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((message, index) => (
          <div
            key={index}
            className={`flex ${
              message.role === 'user' ? 'justify-end' : 'justify-start'
            }`}
          >
            <div className="relative group max-w-[80%]">
              <div
                className={`rounded-lg p-3 ${
                  message.role === 'user'
                    ? 'bg-green-500 text-white'
                    : 'bg-gray-100 text-gray-800'
                }`}
              >
                {editingMessageIndex === index ? (
                  <div className="flex flex-col gap-2">
                    <textarea
                      value={editText}
                      onChange={(e) => setEditText(e.target.value)}
                      className="w-full p-2 text-gray-800 rounded border focus:outline-none focus:ring-2 focus:ring-green-500"
                      rows={3}
                    />
                    <div className="flex justify-end gap-2">
                      <button
                        onClick={() => setEditingMessageIndex(null)}
                        className="px-2 py-1 text-sm text-gray-600 hover:text-gray-800"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={() => handleSaveEdit(index)}
                        className="px-2 py-1 text-sm bg-green-500 text-white rounded hover:bg-green-600"
                      >
                        Save
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className={message.role === 'user' ? 'text-white' : 'text-gray-800'}>
                    <MarkdownWithMath content={message.content} />
                  </div>
                )}
              </div>
              
              {/* Action buttons */}
              <div className={`absolute bottom-0 ${message.role === 'user' ? 'right-0' : 'left-0'} transform translate-y-full opacity-0 group-hover:opacity-100 flex gap-2 mt-1`}>
                <button
                  onClick={() => handleCopy(message.content)}
                  className="p-1 text-gray-500 hover:text-gray-700"
                  title="Copy message"
                >
                  <ClipboardIcon className="h-4 w-4" />
                </button>
                {message.role === 'user' && (
                  <button
                    onClick={() => handleEdit(index)}
                    className="p-1 text-gray-500 hover:text-gray-700"
                    title="Edit message"
                  >
                    <PencilIcon className="h-4 w-4" />
                  </button>
                )}
              </div>
            </div>
          </div>
        ))}
        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-gray-100 text-gray-800 rounded-lg p-3">
              Thinking...
            </div>
          </div>
        )}
      </div>
      
      <form onSubmit={handleSubmit} className="p-4 border-t">
        <div className="flex space-x-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Type your message..."
            className="flex-1 p-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
            disabled={isLoading}
          />
          <button
            type="submit"
            className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={isLoading || !input.trim()}
          >
            Send
          </button>
        </div>
      </form>
    </div>
  );
}; 