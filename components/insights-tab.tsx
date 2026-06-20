'use client';

import { useState } from 'react';
import { useAuth } from '@/components/auth-provider';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Loader2 } from 'lucide-react';

export default function InsightsTab({ currentBalance }: { currentBalance?: number }) {
  const { token } = useAuth();
  const [chatInput, setChatInput] = useState('');
  const [messages, setMessages] = useState([
    { role: 'assistant', text: 'Your food expenses are 25% higher on Food Delivery this week compared to last week.' },
    { role: 'assistant', text: 'Great job! You stayed within your ₹10,000 grocery budget.' },
    { role: 'assistant', text: `Your current SBI balance is ₹${(currentBalance || 245000).toLocaleString('en-IN')}. Need any help forecasting your month?` },
  ]);
  const [isTyping, setIsTyping] = useState(false);

  const handleSend = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!chatInput.trim() || isTyping) return;

    const userMessage = chatInput.trim();
    setChatInput('');
    setMessages(prev => [...prev, { role: 'user', text: userMessage }]);
    setIsTyping(true);

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}` 
        },
        body: JSON.stringify({ message: userMessage, currentBalance }),
      });
      const data = await res.json();
      if (data.text) {
        setMessages(prev => [...prev, { role: 'assistant', text: data.text }]);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsTyping(false);
    }
  };

  return (
    <div className="grid gap-6 md:grid-cols-2">
      <div className="bg-[#1E293B] text-white p-5 rounded-xl flex flex-col shadow-lg border border-white/5 h-[400px]">
        <div className="flex items-center gap-2 mb-4 shrink-0">
          <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></div>
          <span className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Artha Kosha AI</span>
        </div>
        <div className="flex-1 overflow-y-auto pr-2 flex flex-col gap-4">
          {messages.map((msg, idx) => (
             <div key={idx} className={msg.role === 'user' ? 'bg-indigo-600/20 p-3 rounded-lg text-xs leading-relaxed border border-indigo-400/30 text-indigo-100 self-end max-w-[85%]' : 'bg-white/10 p-3 rounded-lg text-xs leading-relaxed border border-white/5 self-start max-w-[85%]'}>
               {msg.text}
             </div>
          ))}
          {isTyping && (
             <div className="bg-white/10 p-3 rounded-lg text-xs leading-relaxed border border-white/5 self-start">
               <Loader2 className="w-4 h-4 animate-spin text-gray-400" />
             </div>
          )}
        </div>
        <form onSubmit={handleSend} className="mt-4 relative shrink-0">
          <input 
            type="text" 
            placeholder="Ask your copilot..." 
            className="w-full bg-white/10 border border-white/10 rounded-lg py-3 px-4 text-sm focus:outline-none focus:border-indigo-500 text-white placeholder:text-gray-500" 
            value={chatInput}
            onChange={(e) => setChatInput(e.target.value)}
          />
          <button type="submit" className="absolute right-3 top-3.5 text-gray-500 hover:text-indigo-400 py-0.5">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14 5l7 7m0 0l-7 7m7-7H3"></path></svg>
          </button>
        </form>
      </div>

      <div className="bg-gray-900 p-5 rounded-xl border border-gray-800 shadow-sm flex flex-col h-[400px]">
        <div className="mb-4 shrink-0">
          <h3 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Spending by Category</h3>
          <p className="text-xs text-gray-500 mt-1">This month&apos;s breakdown</p>
        </div>
        <div className="flex-1 overflow-y-auto pr-2 space-y-4">
           <CategoryRow name="Food & Dining" amount={14500} percent={35} />
           <CategoryRow name="Groceries" amount={8200} percent={20} />
           <CategoryRow name="Transport" amount={4500} percent={10} />
           <CategoryRow name="Shopping" amount={12000} percent={25} />
           <CategoryRow name="Utilities" amount={4200} percent={10} />
        </div>
      </div>
    </div>
  );
}

function CategoryRow({ name, amount, percent }: any) {
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-sm">
        <span className="font-medium text-gray-300">{name}</span>
        <span className="text-gray-500 font-mono">₹{amount.toLocaleString('en-IN')}</span>
      </div>
      <div className="h-2 w-full bg-gray-800 rounded-full overflow-hidden">
        <div className="h-full bg-indigo-500" style={{ width: `${percent}%` }}></div>
      </div>
    </div>
  );
}
