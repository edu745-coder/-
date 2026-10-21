import React, { useState, useRef, useEffect } from 'react';
import { Send, MessageSquare } from 'lucide-react';
import { Side } from '../engine/janggi.ts';

export interface ChatMessage {
  sender: string;
  text: string;
  side?: Side;
  timestamp: number;
}

interface ChatBoxProps {
  messages: ChatMessage[];
  onSendMessage: (text: string) => void;
}

const QUICK_EMOTES = [
  '안녕하세요!',
  '장군!',
  '좋은 수네요 👍',
  '앗! 나의 실수 😅',
  '한수 배웠습니다 🙏',
  '수고하셨습니다 👏',
];

export const ChatBox: React.FC<ChatBoxProps> = ({ messages, onSendMessage }) => {
  const [inputText, setInputText] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (inputText.trim()) {
      onSendMessage(inputText.trim());
      setInputText('');
    }
  };

  return (
    <div className="w-full bg-stone-900/90 border border-stone-800 rounded-xl flex flex-col h-48 overflow-hidden shadow-md">
      {/* Messages Header */}
      <div className="flex items-center gap-1.5 px-3 py-1.5 border-b border-stone-800 text-xs font-semibold text-stone-300 bg-stone-950/40 shrink-0">
        <MessageSquare className="w-3.5 h-3.5 text-amber-400" />
        <span>대국 채팅 & 감정표현</span>
      </div>

      {/* Message List */}
      <div className="flex-1 overflow-y-auto p-2.5 space-y-1.5 text-xs">
        {messages.length === 0 ? (
          <div className="text-center text-stone-500 py-4 text-[11px]">
            빠른 감정표현 버튼을 누르거나 메시지를 입력하세요.
          </div>
        ) : (
          messages.map((m, idx) => {
            const isCho = m.side === 'cho';
            const isHan = m.side === 'han';
            return (
              <div key={idx} className="flex items-start gap-1.5 text-stone-300">
                <span
                  className={`font-bold shrink-0 text-[11px] ${
                    isCho ? 'text-emerald-400' : isHan ? 'text-red-400' : 'text-stone-400'
                  }`}
                >
                  [{m.sender}]
                </span>
                <span className="text-stone-200 break-words flex-1">{m.text}</span>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Quick Emote Chips */}
      <div className="flex items-center gap-1 px-2 py-1 bg-stone-950/60 overflow-x-auto scrollbar-none border-t border-stone-800/80 shrink-0">
        {QUICK_EMOTES.map((emote, idx) => (
          <button
            key={idx}
            type="button"
            onClick={() => onSendMessage(emote)}
            className="px-2 py-0.5 rounded-full text-[10px] bg-stone-800 hover:bg-stone-700 text-stone-300 whitespace-nowrap transition-colors shrink-0"
          >
            {emote}
          </button>
        ))}
      </div>

      {/* Input Field */}
      <form onSubmit={handleSubmit} className="flex gap-1 p-1.5 border-t border-stone-800 bg-stone-900 shrink-0">
        <input
          type="text"
          value={inputText}
          maxLength={60}
          onChange={(e) => setInputText(e.target.value)}
          placeholder="메시지 입력..."
          className="flex-1 px-2 py-1 text-xs bg-stone-800 border border-stone-700 rounded-lg text-stone-100 focus:outline-none focus:border-amber-400"
        />
        <button
          type="submit"
          disabled={!inputText.trim()}
          className="px-2.5 py-1 bg-amber-600 hover:bg-amber-500 disabled:opacity-40 text-white rounded-lg transition-colors"
        >
          <Send className="w-3.5 h-3.5" />
        </button>
      </form>
    </div>
  );
};
