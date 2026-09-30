import React, { useState, useRef, useEffect } from 'react';
import { Sparkles, Send, Bot, User, RefreshCw, MessageSquare, ChefHat, HelpCircle, ArrowRight } from 'lucide-react';
import { AgeGroupTier } from '../types';

interface Message {
  role: 'user' | 'assistant';
  text: string;
  timestamp: number;
}

interface StaffChatbotProps {
  activeAgeTier: AgeGroupTier;
}

export const StaffChatbot: React.FC<StaffChatbotProps> = ({ activeAgeTier }) => {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'assistant',
      text: "Hello! I'm your NutriBoard AI Canteen & Nutrition Advisor. Ask me anything about school lunch recipes, macro balance, iron/protein sources for students (Classes 1–10), food waste reduction strategies, or dietary guidelines!",
      timestamp: Date.now()
    }
  ]);
  const [inputValue, setInputValue] = useState<string>('');
  const [isTyping, setIsTyping] = useState<boolean>(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const quickPrompts = [
    "How can I make lentil dal more appealing to younger kids?",
    "What are the best iron & zinc sources for middle school students?",
    "How do I reduce leftover vegetable and salad waste in the cafeteria?",
    "Suggest a balanced vegetarian menu for Thursday with high protein."
  ];

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isTyping]);

  const handleSendMessage = async (textToSend?: string) => {
    const text = textToSend || inputValue;
    if (!text.trim() || isTyping) return;

    const userMsg: Message = {
      role: 'user',
      text: text.trim(),
      timestamp: Date.now()
    };

    setMessages((prev) => [...prev, userMsg]);
    if (!textToSend) setInputValue('');
    setIsTyping(true);

    try {
      const historyPayload = messages.slice(-6).map((m) => ({
        role: m.role,
        text: m.text
      }));

      const res = await fetch('/api/staff-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: userMsg.text,
          chatHistory: historyPayload,
          activeAgeTier
        })
      });

      const json = await res.json();
      if (json.success && json.reply) {
        setMessages((prev) => [
          ...prev,
          {
            role: 'assistant',
            text: json.reply,
            timestamp: Date.now()
          }
        ]);
      } else {
        throw new Error('Failed to get chatbot response');
      }
    } catch (err) {
      console.error('Staff chat error:', err);
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          text: "I'm having trouble connecting right now, but here's a quick tip: Focus on vibrant colors and mild savory seasoning in school meals to naturally boost student appetite and reduce food waste!",
          timestamp: Date.now()
        }
      ]);
    } finally {
      setIsTyping(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      {/* Header Banner */}
      <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200 shadow-xs relative overflow-hidden space-y-3">
        <div className="h-2 bg-violet-500 w-full absolute top-0 left-0"></div>
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-violet-50 border border-violet-200 flex items-center justify-center text-violet-600">
            <Bot className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-extrabold tracking-tight text-slate-900 flex items-center gap-2">
              NutriBoard AI Nutritionist Assistant
              <span className="text-[10px] font-black uppercase tracking-wider bg-violet-100 text-violet-800 px-2.5 py-0.5 rounded-full border border-violet-200">
                Staff Help Desk
              </span>
            </h1>
            <p className="text-slate-600 text-xs sm:text-sm">
              Ask questions about school recipes, nutritional compliance, student dietary needs, and waste reduction.
            </p>
          </div>
        </div>
      </div>

      {/* Chat Container */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-xs flex flex-col h-[600px] overflow-hidden">
        {/* Chat Messages Area */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 bg-slate-50/50">
          {messages.map((msg, idx) => {
            const isBot = msg.role === 'assistant';
            return (
              <div
                key={`msg-${idx}`}
                className={`flex items-start gap-3 ${isBot ? '' : 'flex-row-reverse'}`}
              >
                <div
                  className={`w-9 h-9 rounded-2xl flex items-center justify-center shrink-0 shadow-xs ${
                    isBot
                      ? 'bg-violet-600 text-white font-bold'
                      : 'bg-emerald-600 text-white font-bold'
                  }`}
                >
                  {isBot ? <Bot className="w-5 h-5" /> : <User className="w-5 h-5" />}
                </div>

                <div
                  className={`max-w-[80%] sm:max-w-[70%] p-4 rounded-2xl text-xs sm:text-sm leading-relaxed shadow-xs ${
                    isBot
                      ? 'bg-white text-slate-800 border border-slate-200 rounded-tl-sm'
                      : 'bg-emerald-600 text-white rounded-tr-sm'
                  }`}
                >
                  <p className="whitespace-pre-wrap">{msg.text}</p>
                  <span
                    className={`block text-[10px] mt-1.5 font-medium ${
                      isBot ? 'text-slate-400' : 'text-emerald-200 text-right'
                    }`}
                  >
                    {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              </div>
            );
          })}

          {isTyping && (
            <div className="flex items-start gap-3">
              <div className="w-9 h-9 rounded-2xl bg-violet-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                <Bot className="w-5 h-5" />
              </div>
              <div className="bg-white border border-slate-200 p-4 rounded-2xl rounded-tl-sm shadow-xs flex items-center gap-2">
                <RefreshCw className="w-4 h-4 text-violet-600 animate-spin" />
                <span className="text-xs text-slate-500 font-medium">NutriBoard AI is thinking...</span>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Quick Suggestion Pills */}
        <div className="p-3 bg-white border-t border-slate-100 flex items-center gap-2 overflow-x-auto scrollbar-none">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider shrink-0 pl-1">
            Suggested Prompts:
          </span>
          {quickPrompts.map((prompt, pIdx) => (
            <button
              key={`qp-${pIdx}`}
              onClick={() => handleSendMessage(prompt)}
              disabled={isTyping}
              className="text-xs bg-slate-100 hover:bg-violet-50 hover:text-violet-800 hover:border-violet-200 text-slate-700 px-3 py-1.5 rounded-full border border-slate-200 shrink-0 transition-colors font-medium cursor-pointer"
            >
              {prompt}
            </button>
          ))}
        </div>

        {/* Input Bar */}
        <div className="p-4 bg-white border-t border-slate-200">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSendMessage();
            }}
            className="flex items-center gap-2"
          >
            <input
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              placeholder="Ask anything about school menus, nutrition macros, or food waste..."
              disabled={isTyping}
              className="flex-1 px-4 py-3 text-xs sm:text-sm border border-slate-300 rounded-2xl focus:outline-hidden focus:ring-2 focus:ring-violet-500 bg-slate-50"
            />
            <button
              type="submit"
              disabled={!inputValue.trim() || isTyping}
              className="px-5 py-3 bg-violet-600 hover:bg-violet-700 disabled:opacity-50 text-white rounded-2xl text-xs sm:text-sm font-bold shadow-xs flex items-center gap-2 transition-all cursor-pointer"
            >
              <span>Send</span>
              <Send className="w-4 h-4" />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};
