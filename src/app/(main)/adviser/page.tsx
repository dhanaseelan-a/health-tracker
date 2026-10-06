'use client';

import { useState, useEffect, useRef } from 'react';
import { useToast } from '@/components/ui/Toast';

export default function AdviserPage() {
  const [loading, setLoading] = useState(false);
  const [advice, setAdvice] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [hasData, setHasData] = useState(true);
  const { showToast } = useToast();

  const getAdvice = async () => {
    setLoading(true);
    setAdvice(null);
    setErrorMsg(null);
    try {
      const dateStr = new Date().toISOString().split('T')[0];
      const res = await fetch('/api/analyze-advice', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ date: dateStr })
      });

      const data = await res.json();
      if (data.noData) {
        setHasData(false);
        setLoading(false);
        return;
      }

      if (data.success) {
        setAdvice(data.advice);
      } else {
        setErrorMsg(data.error || 'Failed to get advice');
      }
    } catch (error) {
      console.error(error);
      setErrorMsg('Error connecting to the AI provider. Check your network or API key.');
    } finally {
      setLoading(false);
    }
  };

  const fetchedRef = useRef(false);

  useEffect(() => {
    if (!fetchedRef.current) {
      fetchedRef.current = true;
      getAdvice();
    }
  }, []);

  const renderAdvice = (text: string) => {
    return text.split('\n').map((para, i) => {
      if (!para.trim()) return <br key={i} />;
      const parts = para.split(/(\*\*.*?\*\*)/g);
      return (
        <p key={i} className="text-charcoal-700 leading-relaxed mb-3">
          {parts.map((part, j) => 
            part.startsWith('**') && part.endsWith('**') 
              ? <strong key={j} className="text-white font-semibold">{part.slice(2, -2)}</strong> 
              : part
          )}
        </p>
      );
    });
  };

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      <header className="mb-8">
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-white mb-2">AI Health Adviser</h1>
        <p className="text-sm text-charcoal-400">Personalized insights based on your daily data and goals.</p>
      </header>

      <div className="glass-panel rounded-3xl p-6 md:p-8 relative overflow-hidden">
        <div className="absolute -top-24 -right-24 w-48 h-48 bg-brand-primary/20 rounded-full blur-3xl"></div>
        
        {loading ? (
          <div className="flex flex-col items-center justify-center py-12 space-y-4">
            <svg className="animate-spin h-8 w-8 text-brand-primary" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            <p className="text-sm text-charcoal-300 animate-pulse">Analyzing your nutrition data...</p>
          </div>
        ) : !hasData ? (
          <div className="text-center py-12">
            <div className="w-16 h-16 bg-surface-100 rounded-full flex items-center justify-center mx-auto mb-4 text-charcoal-400">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-white mb-2">No data yet today</h3>
            <p className="text-sm text-charcoal-400 mb-6">Log some food for today to get personalized health advice.</p>
          </div>
        ) : errorMsg ? (
          <div className="text-center py-8">
            <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-4 text-red-400">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10"></circle>
                <line x1="12" y1="8" x2="12" y2="12"></line>
                <line x1="12" y1="16" x2="12.01" y2="16"></line>
              </svg>
            </div>
            <h3 className="text-lg font-medium text-white mb-2">Analysis Error</h3>
            <p className="text-sm text-red-300 mb-6 max-w-md mx-auto">{errorMsg}</p>
            <button onClick={getAdvice} className="btn btn-secondary text-xs">
              Try Again
            </button>
          </div>
        ) : advice ? (
          <div className="space-y-6">
            <div className="flex items-center gap-3 text-brand-primary border-b border-white/10 pb-4">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
              </svg>
              <h3 className="text-lg font-medium text-white">Your Daily Insight</h3>
            </div>
            <div className="prose prose-invert prose-sm md:prose-base max-w-none">
              {renderAdvice(advice)}
            </div>
            <div className="pt-4 text-center">
              <button onClick={getAdvice} className="btn btn-secondary text-xs">
                Refresh Advice
              </button>
            </div>
          </div>
        ) : (
          <div className="text-center py-12">
            <button onClick={getAdvice} className="btn btn-primary">
              Get Health Advice
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
