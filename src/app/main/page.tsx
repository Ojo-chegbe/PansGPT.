"use client";
import Image from "next/image";
import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import React from "react";
import { type ChatMessage } from '@/lib/google-ai';
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { signOut } from "next-auth/react";
import { ClipboardIcon, PencilIcon } from '@heroicons/react/24/outline';
import MarkdownWithMath from '@/components/MarkdownWithMath';

type MessageRole = 'user' | 'system' | 'model';

interface ExtendedChatMessage {
  role: MessageRole;
  content: string;
  hasContext?: boolean;
  createdAt?: string;
}

interface Conversation {
  id: string;
  name: string;
  messages: ExtendedChatMessage[];
}

interface SubscriptionStatus {
  isActive: boolean;
  isTrial: boolean;
  trialEndDate?: string;
  planType: 'trial' | 'paid' | 'none';
  startDate: string;
}

// Memoize the message list component
const MessageList = React.memo(({ 
  messages, 
  editingIdx, 
  editingText,
  setEditingText,
  copiedIdx, 
  handleEdit, 
  handleEditCancel, 
  handleEditSave, 
  handleCopy,
  isLoading
}: {
  messages: ChatMessage[];
  editingIdx: number | null;
  editingText: string;
  setEditingText: (text: string) => void;
  copiedIdx: number | null;
  handleEdit: (idx: number) => void;
  handleEditCancel: () => void;
  handleEditSave: (idx: number) => void;
  handleCopy: (idx: number, content: string) => void;
  isLoading: boolean;
}) => (
  <div className="max-w-6xl mx-auto w-full flex flex-col gap-4 md:gap-8">
    {messages.map((message, idx) => (
      <div key={idx} className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}>
        <div className="relative group max-w-[90%] md:max-w-[80%]">
          <div className={`rounded-lg p-2.5 md:p-3 ${
            message.role === 'user'
              ? 'bg-green-500 text-white'
              : 'text-white'
          }`}>
            {editingIdx === idx ? (
              <div className="flex flex-col gap-2">
                <textarea
                  value={editingText}
                  onChange={(e) => setEditingText(e.target.value)}
                  className="w-full p-2 text-gray-800 rounded border focus:outline-none focus:ring-2 focus:ring-green-500 text-sm md:text-base"
                  rows={3}
                />
                <div className="flex justify-end gap-2">
                  <button
                    onClick={() => handleEditCancel()}
                    className="px-2 py-1 text-xs md:text-sm text-gray-600 hover:text-gray-800"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => handleEditSave(idx)}
                    className="px-2 py-1 text-xs md:text-sm bg-green-500 text-white rounded hover:bg-green-600"
                  >
                    Send
                  </button>
                </div>
              </div>
            ) : (
              <>
                <MarkdownWithMath content={message.content} role={message.role} />
                {message.role === 'model' && message.hasContext && (
                  <div className="mt-1.5 md:mt-2 text-xs md:text-sm text-gray-500 italic">
                    Information from uploaded documents
                  </div>
                )}
              </>
            )}
          </div>
          {/* Action buttons */}
          <div className={`flex items-center gap-2 md:gap-3 mt-1 justify-${message.role === 'user' ? 'end' : 'start'} opacity-0 group-hover:opacity-100 transition-opacity`}>
            <button
              onClick={() => handleCopy(idx, message.content)}
              className="text-gray-400 hover:text-white transition-colors"
              title="Copy message"
            >
              {copiedIdx === idx ? (
                <span className="text-xs text-green-400">Copied!</span>
              ) : (
                <ClipboardIcon className="h-3.5 w-3.5 md:h-4 md:w-4" />
              )}
            </button>
            {message.role === 'user' && (
              <button
                onClick={() => handleEdit(idx)}
                className="text-gray-400 hover:text-white transition-colors"
                title="Edit message"
              >
                <PencilIcon className="h-3.5 w-3.5 md:h-4 md:w-4" />
              </button>
            )}
          </div>
        </div>
      </div>
    ))}
    
    {/* Loading indicator */}
    {isLoading && (
      <div className="flex justify-start">
        <div className="relative group max-w-[90%] md:max-w-[80%]">
          <div className="rounded-lg p-2.5 md:p-3 text-white bg-gray-800 border border-gray-700 animate-pulse">
            <div className="flex items-center gap-3">
              <div className="flex space-x-1">
                <div className="w-2 h-2 bg-green-400 rounded-full animate-bounce"></div>
                <div className="w-2 h-2 bg-green-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                <div className="w-2 h-2 bg-green-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
              </div>
              <span className="text-sm text-gray-300 font-medium">PANSGPT is thinking...</span>
            </div>
          </div>
        </div>
      </div>
    )}
  </div>
));

// Memoize the input area component
const InputArea = React.memo(({ 
  input, 
  handleInputChange, 
  handleSend, 
  isLoading, 
  sidebarOpen 
}: {
  input: string;
  handleInputChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  handleSend: (e: React.FormEvent) => void;
  isLoading: boolean;
  sidebarOpen: boolean;
}) => (
  <form
    onSubmit={handleSend}
    className={`fixed bottom-0 z-40 transition-all duration-300 ${sidebarOpen ? 'left-0 md:left-72 w-full md:w-[calc(100%-18rem)]' : 'left-0 w-full'} px-3 md:px-24 pb-3 md:pb-8`}
  >
    <div className={`bg-black rounded-lg flex items-center px-3 md:px-8 py-3 md:py-6 max-w-6xl mx-auto border-2 transition-all duration-300 ${
      isLoading 
        ? 'border-green-400 shadow-lg shadow-green-400/20' 
        : 'border-white'
    }`}>
      <input
        type="text"
        placeholder={isLoading ? "PANSGPT is processing your message..." : "Ask a question from any course."}
        className="flex-1 bg-transparent outline-none text-sm md:text-base text-white placeholder-gray-400"
        value={input}
        onChange={handleInputChange}
        disabled={isLoading}
      />
      <button
        type="submit"
        className="ml-3 md:ml-4 bg-white text-black px-2.5 md:px-6 py-1.5 md:py-2 rounded-md font-semibold text-sm md:text-base disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
        disabled={isLoading || !input.trim()}
      >
        {isLoading ? (
          <>
            <div className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin"></div>
            <span>Thinking...</span>
          </>
        ) : (
          'Send'
        )}
      </button>
    </div>
  </form>
));

export default function MainPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const menuRef = useRef(null);
  const userMenuRef = useRef(null);
  const [userSubscription, setUserSubscription] = useState<SubscriptionStatus | null>(null);
  const [editingIdx, setEditingIdx] = useState<number | null>(null);
  const [editingText, setEditingText] = useState("");
  const [copiedIdx, setCopiedIdx] = useState<number | null>(null);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [messages, setMessages] = useState<ExtendedChatMessage[]>([]);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [renamingIdx, setRenamingIdx] = useState<number | null>(null);
  const [renameText, setRenameText] = useState("");
  const [historyMenuIdx, setHistoryMenuIdx] = useState<number | null>(null);
  const [userLevel, setUserLevel] = useState<string>("");
  const chatEndRef = useRef<HTMLDivElement | null>(null);
  const messagesRef = useRef<ExtendedChatMessage[]>([]);

  // Helper to get active conversation
  const activeConv = conversations.find(c => c.id === activeId);
  const messagesInConv = activeConv ? activeConv.messages : [];

  // Edit/copy handlers
  const handleCopy = async (idx: number, content: string) => {
    try {
      await navigator.clipboard.writeText(content);
      setCopiedIdx(idx);
      setTimeout(() => setCopiedIdx(null), 1200);
    } catch (err) {
      console.error('Failed to copy text:', err);
    }
  };

  const handleEdit = (idx: number) => {
    if (messagesInConv[idx].role === 'user') {
      setEditingIdx(idx);
      setEditingText(messagesInConv[idx].content);
    }
  };

  // Streaming chat API helper
  async function streamChatApi(
    message: string,
    conversationHistory: ExtendedChatMessage[],
    onChunk: (chunk: string) => void,
    userLevel?: string
  ) {
    const response = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message, conversationHistory, userLevel }),
    });
    if (!response.body) throw new Error('No response body');
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      let lines = buffer.split('\n');
      buffer = lines.pop() || '';
      for (const line of lines) {
        if (line.trim()) {
          try {
            const { chunk } = JSON.parse(line);
            onChunk(chunk);
          } catch {}
        }
      }
    }
    if (buffer.trim()) {
      try {
        const { chunk } = JSON.parse(buffer);
        onChunk(chunk);
      } catch {}
    }
  }

  const handleEditSave = async (idx: number) => {
    if (!editingText.trim()) return;
    
    // Get the current active conversation to avoid stale closure
    const currentActiveConv = conversations.find(c => c.id === activeId);
    if (!currentActiveConv) return;
    
    const updatedMessages = [...currentActiveConv.messages];
    updatedMessages[idx] = {
      ...updatedMessages[idx],
      content: editingText.trim()
    };
    const messagesToKeep = updatedMessages.slice(0, idx + 1);
    const aiLoadingMessage = {
      role: 'model' as MessageRole,
      content: '', // Streaming will fill this
      hasContext: false,
      createdAt: new Date().toISOString(),
    };
    const newMessagesLoading = [...messagesToKeep, aiLoadingMessage];
    setConversations(prev => prev.map(c =>
      c.id === activeId
        ? { ...c, messages: newMessagesLoading }
        : c
    ));
    setMessages(newMessagesLoading);
    setEditingIdx(null);
    setEditingText("");
    setIsLoading(true);
    try {
      await streamChatApi(
        editingText.trim(),
        messagesToKeep,
        (chunk) => {
          let text = chunk;
          // If chunk is a JSON string, extract the 'response' field
          try {
            const parsed = typeof chunk === 'string' ? JSON.parse(chunk) : chunk;
            if (parsed && typeof parsed === 'object' && parsed.response) {
              text = parsed.response;
            }
          } catch {}
          setMessages(prev => {
            const updated = [...prev];
            const lastIdx = updated.length - 1;
            if (updated[lastIdx]?.role === 'model') {
              updated[lastIdx] = {
                ...updated[lastIdx],
                content: updated[lastIdx].content + text,
              };
            }
            messagesRef.current = updated;
            return updated;
          });
        },
        userLevel
      );
      // Auto-save after streaming completes, using latest messages from ref
      if (session?.user?.id) {
        const latestMessages = messagesRef.current;
        const payload = {
          id: activeId,
          title: currentActiveConv.name || 'Conversation',
          messages: latestMessages,
          userId: session.user.id
        };
        
        console.log('Saving edited conversation:', {
          activeId,
          hasActiveConv: !!currentActiveConv,
          messageCount: latestMessages.length,
          payload
        });
        
        const saveResponse = await fetch("/api/conversations", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
          credentials: 'include',
        });
        
        if (saveResponse.ok) {
          const savedConversation = await saveResponse.json();
          console.log('Edited conversation saved successfully:', {
            conversationId: savedConversation.id,
            messageCount: savedConversation.messages?.length || 0
          });
          
          const updatedConversation = {
            id: savedConversation.id,
            name: savedConversation.title,
            messages: savedConversation.messages.map((msg: any) => ({
              role: msg.role as MessageRole,
              content: msg.content,
              createdAt: new Date(msg.createdAt)
            }))
          };
          
          // Update conversations list and set active conversation
          setConversations(prev => {
            const existingIndex = prev.findIndex(c => c.id === activeId);
            if (existingIndex >= 0) {
              // Update existing conversation
              const updated = [...prev];
              updated[existingIndex] = updatedConversation;
              return updated;
            } else {
              // Add new conversation to the beginning
              return [updatedConversation, ...prev];
            }
          });
          
          // Update active ID if it changed (for new conversations)
          if (savedConversation.id !== activeId) {
            setActiveId(savedConversation.id);
          }
          
          setMessages(updatedConversation.messages);
        } else {
          console.error('Failed to save edited conversation:', saveResponse.status, saveResponse.statusText);
          const errorText = await saveResponse.text();
          console.error('Error details:', errorText);
        }
      }
    } catch (error) {
      console.error('Error in handleEditSave:', error);
      setMessages(prev => [...prev, {
        role: 'model',
        content: 'I apologize, but I encountered an error. Please try again.'
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleEditCancel = () => {
    setEditingIdx(null);
    setEditingText("");
  };

  // Close dropdowns on outside click
  React.useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (menuRef.current && !(menuRef.current as any).contains(e.target)) setShowMenu(false);
      if (userMenuRef.current && !(userMenuRef.current as any).contains(e.target)) setShowUserMenu(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  // New chat
  async function handleNewChat() {
    if (!session?.user?.id) return;
    try {
      const response = await fetch("/api/conversations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: "New Conversation",
          messages: [],
          userId: session.user.id,
        }),
        credentials: "include",
      });
      
      if (response.ok) {
        const newConversation = await response.json();
        const formattedConversation = {
          id: newConversation.id,
          name: newConversation.title,
          messages: []
        };
        setConversations(prev => [formattedConversation, ...prev]);
        setActiveId(newConversation.id);
        setMessages([]);
        setEditingIdx(null);
        setEditingText("");
      }
    } catch (err) {
      console.error("Error creating new conversation:", err);
    }
  }

  // Load user's conversations on mount and subscription status
  useEffect(() => {
    async function loadData() {
      if (session?.user?.id) {
        try {
          // Fetch subscription status
          const subscriptionResponse = await fetch('/api/subscription/status', {
            credentials: 'include',
          });
          const subscriptionData = await subscriptionResponse.json();
          setUserSubscription(subscriptionData);

          // Load conversations from database
          const response = await fetch(`/api/conversations?userId=${session.user.id}&limit=10&messageLimit=50`, {
            credentials: 'include',
          });
          const data = await response.json();
          
          console.log('Loaded conversations from database:', {
            hasData: !!data,
            conversationsCount: data.conversations?.length || 0,
            firstConversation: data.conversations?.[0] ? {
              id: data.conversations[0].id,
              title: data.conversations[0].title,
              messageCount: data.conversations[0].messages?.length || 0
            } : null
          });
          
          if (data.conversations && data.conversations.length > 0) {
            const formattedConversations = data.conversations.map((conv: any) => ({
              id: conv.id,
              name: conv.title,
              messages: conv.messages.map((msg: any) => ({
                role: msg.role as MessageRole,
                content: msg.content,
                createdAt: new Date(msg.createdAt)
              }))
            }));
            setConversations(formattedConversations);
            setActiveId(formattedConversations[0].id);
            setMessages(formattedConversations[0].messages);
            
            console.log('Set conversations in state:', {
              conversationsCount: formattedConversations.length,
              activeId: formattedConversations[0].id,
              firstConversationMessages: formattedConversations[0].messages.length
            });
          } else {
            // Create a new conversation in the database if none exist
            console.log('No conversations found, creating new one');
            await createNewConversation();
          }
        } catch (err) {
          console.error("Error loading user data:", err);
          // Create a new conversation if there's an error
          await createNewConversation();
        }
      }
    }
    loadData();
  }, [session?.user?.id]);

  // Function to create a new conversation in the database
  const createNewConversation = async () => {
    if (!session?.user?.id) return;
    
    try {
      const response = await fetch("/api/conversations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: "New Conversation",
          messages: [],
          userId: session.user.id,
        }),
        credentials: "include",
      });
      
      if (response.ok) {
        const newConversation = await response.json();
        const formattedConversation = {
          id: newConversation.id,
          name: newConversation.title,
          messages: []
        };
        setConversations([formattedConversation]);
        setActiveId(newConversation.id);
        setMessages([]);
      }
    } catch (err) {
      console.error("Error creating new conversation:", err);
    }
  };

  // Remove localStorage usage - database is now the single source of truth
  // useEffect(() => {
  //   localStorage.setItem('ai_conversations', JSON.stringify(conversations));
  //   if (activeId) localStorage.setItem('ai_activeId', activeId);
  // }, [conversations, activeId]);

  // Remove localStorage restoration - we load from database instead
  // useEffect(() => {
  //   const storedId = localStorage.getItem('ai_activeId');
  //   if (storedId && conversations.some(c => c.id === storedId)) {
  //     setActiveId(storedId);
  //   }
  // }, [conversations]);

  // Memoize sorted messages to prevent unnecessary sorting
  const sortedMessages = useMemo(() => {
    if (!activeConv) return [];
    return [...activeConv.messages].sort((a, b) => {
      const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return dateA - dateB;
    });
  }, [activeConv?.messages]);

  // Update messages when sorted messages change
  useEffect(() => {
    setMessages(sortedMessages);
  }, [sortedMessages]);

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    if (chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  // Update messagesRef whenever messages change
  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);

  // Memoize the input handler
  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setInput(e.target.value);
  }, []);

  // Fetch user level on mount or when session changes
  useEffect(() => {
    async function fetchLevel() {
      if (session?.user) {
        try {
          const res = await fetch('/api/user');
          if (res.ok) {
            const data = await res.json();
            if (data.user?.level) setUserLevel(data.user.level);
          }
        } catch {}
      }
    }
    fetchLevel();
  }, [session]);

  // Send message - Database-first approach with immediate UI update
  const handleSend = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;
    setIsLoading(true);
    const userMessage: ExtendedChatMessage = {
      role: 'user',
      content: input.trim(),
      createdAt: new Date().toISOString(),
    };
    const aiLoadingMessage: ExtendedChatMessage = {
      role: 'model',
      content: '', // Streaming will fill this
      createdAt: new Date().toISOString(),
    };
    const newMessages = [...(activeConv?.messages || []), userMessage, aiLoadingMessage];
    setMessages(newMessages);
    setConversations(prev => prev.map(c =>
      c.id === activeId
        ? { ...c, messages: newMessages }
        : c
    ));
    setInput('');
    try {
      await streamChatApi(
        userMessage.content,
        [...(activeConv?.messages || []), userMessage],
        (chunk) => {
          setMessages(prev => {
            const updated = [...prev];
            const lastIdx = updated.length - 1;
            if (updated[lastIdx]?.role === 'model') {
              updated[lastIdx] = {
                ...updated[lastIdx],
                content: updated[lastIdx].content + chunk,
              };
            }
            messagesRef.current = updated;
            return updated;
          });
        },
        userLevel
      );
      // Auto-save after streaming completes, using latest messages from ref
      if (session?.user?.id) {
        const latestMessages = messagesRef.current;
        const payload = {
          id: activeId,
          title: activeConv?.name || 'Conversation',
          messages: latestMessages,
          userId: session.user.id
        };
        
        console.log('Saving conversation:', {
          activeId,
          hasActiveConv: !!activeConv,
          messageCount: latestMessages.length,
          payload
        });
        
        const saveResponse = await fetch("/api/conversations", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
          credentials: 'include',
        });
        
        if (saveResponse.ok) {
          const savedConversation = await saveResponse.json();
          console.log('Conversation saved successfully:', {
            conversationId: savedConversation.id,
            messageCount: savedConversation.messages?.length || 0
          });
          
          const updatedConversation = {
            id: savedConversation.id,
            name: savedConversation.title,
            messages: savedConversation.messages.map((msg: any) => ({
              role: msg.role as MessageRole,
              content: msg.content,
              createdAt: new Date(msg.createdAt)
            }))
          };
          
          // Update conversations list and set active conversation
          setConversations(prev => {
            const existingIndex = prev.findIndex(c => c.id === activeId);
            if (existingIndex >= 0) {
              // Update existing conversation
              const updated = [...prev];
              updated[existingIndex] = updatedConversation;
              return updated;
            } else {
              // Add new conversation to the beginning
              return [updatedConversation, ...prev];
            }
          });
          
          // Update active ID if it changed (for new conversations)
          if (savedConversation.id !== activeId) {
            setActiveId(savedConversation.id);
          }
          
          setMessages(updatedConversation.messages);
        } else {
          console.error('Failed to save conversation:', saveResponse.status, saveResponse.statusText);
          const errorText = await saveResponse.text();
          console.error('Error details:', errorText);
        }
      }
    } catch (error) {
      setMessages(prev => [...prev, {
        role: 'model',
        content: 'I apologize, but I encountered an error. Please try again.'
      }]);
    } finally {
      setIsLoading(false);
    }
  }, [input, isLoading, activeConv, activeId, session?.user?.id, messages, userLevel]);

  // Chat history actions
  function handleSelectConv(id: string) {
    setActiveId(id);
    setEditingIdx(null);
    setEditingText("");
  }
  async function handleDeleteConv(idx: number) {
    const convToDelete = conversations[idx];
    if (!convToDelete || !session?.user?.id) return;

    try {
      const response = await fetch(`/api/conversations?id=${convToDelete.id}`, {
        method: 'DELETE',
        credentials: 'include',
      });

      if (!response.ok) {
        console.error('Failed to delete conversation');
        return;
      }

      // Update local state after successful deletion
    setConversations(prev => prev.filter((_, i) => i !== idx));
    if (conversations[idx]?.id === activeId) {
        // If deleting active, switch to another or create new one
        if (conversations.length > 1) {
          setActiveId(conversations[(idx === 0 ? 1 : 0)].id);
        } else {
          // If this was the last conversation, create a new one
          const newId = Date.now().toString();
          const newConversation = { id: newId, name: 'New Conversation', messages: [] };
          setConversations([newConversation]);
          setActiveId(newId);
          setMessages([]);
        }
    }
    setHistoryMenuIdx(null);
    } catch (err) {
      console.error('Error deleting conversation:', err);
    }
  }
  function handleRenameConv(idx: number) {
    setRenamingIdx(idx);
    setRenameText(conversations[idx].name);
    setHistoryMenuIdx(null);
  }
  async function handleRenameSave(idx: number) {
    const conv = conversations[idx];
    const updatedName = renameText.trim();
    if (!updatedName || !conv) {
      setRenamingIdx(null);
      setRenameText("");
      return;
    }
    // Update UI immediately
    setConversations(prev => prev.map((c, i) => i === idx ? { ...c, name: updatedName } : c));
    setRenamingIdx(null);
    setRenameText("");
    // Persist to backend
    try {
      await fetch("/api/conversations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: conv.id,
          title: updatedName,
          messages: conv.messages,
          userId: session?.user?.id
        }),
        credentials: 'include',
      });
    } catch (err) {
      console.error('Error renaming conversation:', err);
    }
  }
  function handleRenameCancel() {
    setRenamingIdx(null);
    setRenameText("");
  }

  // Add this useEffect to auto-create a conversation on mount:
  React.useEffect(() => {
    if (conversations.length === 0 && session?.user?.id) {
      const id = Date.now().toString();
      setConversations([{ id, name: 'New Conversation', messages: [] }]);
      setActiveId(id);
    }
    // eslint-disable-next-line
  }, [conversations.length, session?.user?.id]);

  // Add authentication check
  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
    }
  }, [status, router]);

  // Handle logout
  const handleLogout = async () => {
    await signOut({ redirect: true, callbackUrl: "/" });
  };

  // Add this function to delete the active conversation from the top nav bar
  function handleDeleteActiveConv() {
    if (!activeId) return;
    const idx = conversations.findIndex(c => c.id === activeId);
    if (idx !== -1) {
      handleDeleteConv(idx);
    }
    setShowMenu(false); // Close the menu after deleting
  }

  // Prevent background scroll when sidebar is open (mobile)
  useEffect(() => {
    if (sidebarOpen) {
      document.body.classList.add('overflow-hidden');
    } else {
      document.body.classList.remove('overflow-hidden');
    }
    return () => {
      document.body.classList.remove('overflow-hidden');
    };
  }, [sidebarOpen]);

  // Don't render anything while checking authentication
  if (status === "loading") {
    return (
      <div className="flex min-h-screen bg-black text-white items-center justify-center">
        <div className="text-xl">Loading...</div>
      </div>
    );
  }

  // Don't render if not authenticated
  if (status === "unauthenticated") {
    return null;
  }

  return (
    <div className="flex min-h-screen bg-black text-white">
      {/* Sidebar */}
      {sidebarOpen && (
        <aside className="w-[85vw] md:w-72 bg-[#181A1B] h-screen fixed left-0 top-0 z-50 flex flex-col">
          {/* Close button for mobile */}
          <button
            className="absolute top-3 right-3 md:hidden text-gray-400 hover:text-white text-3xl z-50"
            onClick={() => setSidebarOpen(false)}
            aria-label="Close sidebar"
          >
            &times;
          </button>
          {/* Take a Quiz button at the top */}
          <div className="pt-5 pb-2 flex-shrink-0">
            <button
              className="w-auto px-6 ml-4 text-left text-white bg-green-600 hover:bg-green-700 text-sm md:text-lg font-semibold rounded-md py-2 transition"
              onClick={() => {
                if (userSubscription && (userSubscription.isActive || userSubscription.isTrial)) {
                  window.location.href = '/quiz';
                } else {
                  window.location.href = '/plan';
                }
              }}
              disabled={!userSubscription}
            >
              Take a Quiz
            </button>
          </div>
          {/* Chat history header with new chat icon */}
          <div className="flex items-center justify-between px-4 mb-3 mt-2">
            <div className="text-base md:text-lg font-semibold">Chat History</div>
            <button
              className="p-1 rounded hover:bg-gray-800 text-gray-300"
              title="New Chat"
              onClick={handleNewChat}
            >
              <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <line x1="12" y1="5" x2="12" y2="19" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                <line x1="5" y1="12" x2="19" y2="12" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
              </svg>
            </button>
          </div>
          {/* Chat history (scrollable only here) */}
          <div className="flex-1 flex flex-col px-4 min-h-0">
            <div className="flex-1 overflow-y-auto pr-2 min-h-0">
              <ul className="space-y-1">
                {conversations.map((conv, idx) => (
                  <li
                    key={conv.id}
                    className={`px-2 py-1.5 md:px-3 md:py-2 rounded-md cursor-pointer text-sm flex items-center justify-between ${conv.id === activeId ? "bg-gray-700 text-white" : "text-gray-400 hover:bg-gray-800 hover:text-white"}`}
                    onClick={() => handleSelectConv(conv.id)}
                  >
                    {renamingIdx === idx ? (
                      <form
                        onSubmit={e => { e.preventDefault(); handleRenameSave(idx); }}
                        className="flex-1 flex gap-2 items-center"
                      >
                        <input
                          className="bg-gray-900 text-white rounded px-2 py-1 text-xs border border-gray-600 flex-1"
                          value={renameText || ""}
                          onChange={e => setRenameText(e.target.value)}
                          autoFocus
                        />
                        <button type="submit" className="text-green-400 text-xs font-semibold">Save</button>
                        <button type="button" className="text-gray-400 text-xs font-semibold" onClick={handleRenameCancel}>Cancel</button>
                      </form>
                    ) : (
                      <>
                        <span className="truncate flex-1">{conv.name}</span>
                        {/* Three-dot menu (desktop only) */}
                        <div className="relative">
                          <button
                            className="p-1 ml-2 rounded hover:bg-gray-800 text-gray-300"
                            onClick={e => { e.stopPropagation(); setHistoryMenuIdx(idx === historyMenuIdx ? null : idx); }}
                          >
                            <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                              <circle cx="12" cy="5" r="2"/>
                              <circle cx="12" cy="12" r="2"/>
                              <circle cx="12" cy="19" r="2"/>
                            </svg>
                          </button>
                          {historyMenuIdx === idx && (
                            <div className="absolute right-0 mt-2 w-32 bg-[#232625] rounded-lg shadow-lg py-2 z-50">
                              <button className="block w-full text-left px-4 py-2 hover:bg-gray-700 text-sm" onClick={e => { e.stopPropagation(); handleRenameConv(idx); }}>Rename</button>
                              <button className="block w-full text-left px-4 py-2 hover:bg-gray-700 text-sm" onClick={e => { e.stopPropagation(); handleDeleteConv(idx); }}>Delete conversation</button>
                            </div>
                          )}
                        </div>
                      </>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          </div>
          {/* Logo at the bottom */}
          <div className="mt-6 mb-4 pl-4 flex items-end">
            <div className="w-24 h-24 md:w-32 md:h-32 relative">
              <Image
                src="/uploads/Logo 2.png"
                alt="Logo"
                fill
                className="object-contain"
              />
            </div>
          </div>
        </aside>
      )}
      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col min-h-screen bg-black">
        {/* Top Bar - Fixed */}
        <div className="fixed top-0 right-0 left-0 md:left-72 z-40 bg-black flex items-center px-3 md:px-6 py-2 md:py-3 gap-2 md:gap-4">
          {/* Sidebar toggle button - moved here */}
          <button
            className={`flex items-center justify-center rounded-full transition-all duration-200 bg-gray-900 border-2 border-white hover:bg-gray-700`}
            style={{ width: 36, height: 36, fontSize: 24 }}
            onClick={() => setSidebarOpen((open) => !open)}
            aria-label={sidebarOpen ? "Close sidebar" : "Open sidebar"}
          >
            {sidebarOpen ? (
              <svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                <path d="M18 6L6 18" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"/>
                <path d="M6 6L18 18" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"/>
              </svg>
            ) : (
              <svg width="28" height="28" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                <line x1="4" y1="6" x2="20" y2="6" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"/>
                <line x1="4" y1="12" x2="20" y2="12" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"/>
                <line x1="4" y1="18" x2="20" y2="18" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"/>
              </svg>
            )}
          </button>
          {/* Left: empty for spacing on mobile, hidden on desktop */}
          <div className="w-8 md:hidden" />
          {/* Center: Plan status - centered on mobile, right on desktop */}
          <div className="flex-1 flex justify-center md:justify-end">
            <button
              className="flex items-center gap-1.5 bg-black px-2 md:px-3 py-1 md:py-2 rounded-lg font-medium hover:bg-gray-700 transition text-xs"
              onClick={() => { window.location.href = '/plan'; }}
              disabled={!userSubscription}
            >
              {userSubscription?.isTrial ? 'Free Trial' : userSubscription?.planType === 'paid' ? 'Premium Plan' : 'No Active Plan'}
            </button>
          </div>
          {/* Right: User profile and menu */}
          <div className="flex items-center gap-2">
            <div className="relative" ref={userMenuRef}>
              <div className="w-6 h-6 md:w-8 md:h-8 relative">
                <Image
                  src="/uploads/user-placeholder.png"
                  alt="User"
                  fill
                  className="rounded-full cursor-pointer object-cover"
                  onClick={() => setShowUserMenu((v) => !v)}
                />
              </div>
              {showUserMenu && (
                <div className="absolute right-0 mt-2 w-40 md:w-48 bg-[#232625] rounded-lg shadow-lg py-2 z-50">
                  <button 
                    className="block w-full text-left px-3 py-1.5 md:px-4 md:py-2 hover:bg-gray-700 text-xs md:text-sm"
                    onClick={() => router.push('/profile')}
                  >
                    View Profile
                  </button>
                  <button className="block w-full text-left px-3 py-1.5 md:px-4 md:py-2 hover:bg-gray-700 text-xs md:text-sm"
                    onClick={() => router.push('/faq')}
                  >Help & FAQs</button>
                  <button 
                    className="block w-full text-left px-3 py-1.5 md:px-4 md:py-2 hover:bg-gray-700 text-xs md:text-sm"
                    onClick={() => router.push('/feedback')}
                  >
                    Feedback
                  </button>
                  <button 
                    className="block w-full text-left px-3 py-1.5 md:px-4 md:py-2 hover:bg-gray-700 text-xs md:text-sm" 
                    onClick={handleLogout}
                  >
                    Logout
                  </button>
                </div>
              )}
            </div>
            {/* Three-dot vertical menu */}
            <div className="relative" ref={menuRef}>
              <button
                className="text-white p-1.5 rounded-full hover:bg-gray-700"
                onClick={() => setShowMenu((v) => !v)}
                aria-label="Open menu"
              >
                <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <circle cx="12" cy="5" r="2"/>
                  <circle cx="12" cy="12" r="2"/>
                  <circle cx="12" cy="19" r="2"/>
                </svg>
              </button>
              {showMenu && (
                <div className="absolute right-0 mt-2 w-32 bg-[#232625] rounded-lg shadow-lg py-2 z-50">
                  <button className="block w-full text-left px-4 py-2 hover:bg-gray-700 text-sm" onClick={handleDeleteActiveConv}>Delete conversation</button>
                </div>
              )}
            </div>
          </div>
        </div>
        {/* Chat Area - Adjusted with top padding to account for fixed topbar */}
        <div className={`flex-1 flex flex-col px-3 md:px-8 pt-16 md:pt-20 pb-24 md:pb-40 gap-4 md:gap-8 overflow-y-auto bg-black transition-all duration-300 ${sidebarOpen ? 'md:ml-72' : ''}`}
          style={{ position: 'relative' }}
        >
          {messages.length === 0 ? (
            <div className="flex-1 flex items-center justify-center">
              <span className="text-2xl md:text-5xl font-bold text-center text-white">
                Hello, Great PANSite
              </span>
            </div>
          ) : (
            <>
              <MessageList
                messages={messages}
                editingIdx={editingIdx}
                editingText={editingText}
                setEditingText={setEditingText}
                copiedIdx={copiedIdx}
                handleEdit={handleEdit}
                handleEditCancel={handleEditCancel}
                handleEditSave={handleEditSave}
                handleCopy={handleCopy}
                isLoading={isLoading}
              />
              <div ref={chatEndRef} />
            </>
          )}
        </div>
        {/* Input Area */}
          <InputArea
            input={input}
            handleInputChange={handleInputChange}
            handleSend={handleSend}
            isLoading={isLoading}
            sidebarOpen={sidebarOpen}
          />
      </div>
    </div>
  );
} 