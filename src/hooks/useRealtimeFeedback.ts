import { useState, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { SPINScores, FeedbackSuggestion } from '@/components/RealTimeFeedbackIndicator';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

interface UseRealtimeFeedbackOptions {
  analyzeEveryNMessages?: number;
  sessionId?: string;
}

interface UseRealtimeFeedbackReturn {
  scores: SPINScores;
  suggestions: FeedbackSuggestion[];
  overallScore: number;
  messageCount: number;
  isAnalyzing: boolean;
  addMessage: (message: Message) => void;
  analyze: () => Promise<void>;
  reset: () => void;
}

const DEFAULT_SCORES: SPINScores = {
  situation: 0,
  problem: 0,
  implication: 0,
  needPayoff: 0,
};

export const useRealtimeFeedback = (
  options: UseRealtimeFeedbackOptions = {}
): UseRealtimeFeedbackReturn => {
  const { analyzeEveryNMessages = 2, sessionId } = options;

  const [scores, setScores] = useState<SPINScores>(DEFAULT_SCORES);
  const [suggestions, setSuggestions] = useState<FeedbackSuggestion[]>([]);
  const [overallScore, setOverallScore] = useState(0);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const messagesRef = useRef<Message[]>([]);
  const userMessageCountRef = useRef(0); // Count only user messages
  const [messageCount, setMessageCount] = useState(0);

  const analyze = useCallback(async () => {
    if (messagesRef.current.length === 0) {
      console.log('[Feedback] No messages to analyze');
      return;
    }

    console.log(`[Feedback] Starting analysis with ${messagesRef.current.length} messages`);
    setIsAnalyzing(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        console.error('[Feedback] No active session for analysis');
        return;
      }

      console.log('[Feedback] Calling analyze-competencies function...');
      const response = await supabase.functions.invoke('analyze-competencies', {
        body: {
          messages: messagesRef.current,
          sessionId,
        },
      });

      console.log('[Feedback] Response:', response);

      if (response.error) {
        console.error('[Feedback] Error analyzing SPIN:', response.error);
        // Try to get more details from the response
        if (response.data?.error) {
          console.error('[Feedback] Server error message:', response.data.error);
        }
        return;
      }

      // Check if response has an error in the data
      if (response.data?.error) {
        console.error('[Feedback] API error:', response.data.error);
        return;
      }

      const { scores: newScores, suggestions: newSuggestions, overallScore: newOverall } = response.data || {};

      console.log('[Feedback] New scores:', newScores);
      console.log('[Feedback] New suggestions:', newSuggestions);
      console.log('[Feedback] Overall score:', newOverall);

      if (newScores) {
        setScores(newScores);
      }

      if (newSuggestions && newSuggestions.length > 0) {
        setSuggestions(prev => [...prev, ...newSuggestions]);
      }

      if (typeof newOverall === 'number') {
        setOverallScore(newOverall);
      }
    } catch (error) {
      console.error('[Feedback] Error in analyze:', error);
    } finally {
      setIsAnalyzing(false);
    }
  }, [sessionId]);

  const addMessage = useCallback((message: Message) => {
    messagesRef.current.push(message);
    setMessageCount(messagesRef.current.length);

    // Only count and analyze user messages
    if (message.role === 'user') {
      userMessageCountRef.current += 1;
      console.log(`[Feedback] User message #${userMessageCountRef.current}:`, message.content.substring(0, 50));

      // Trigger analysis every N user messages
      if (userMessageCountRef.current % analyzeEveryNMessages === 0) {
        console.log(`[Feedback] Triggering analysis after ${userMessageCountRef.current} user messages`);
        analyze();
      }
    }
  }, [analyze, analyzeEveryNMessages]);

  const reset = useCallback(() => {
    messagesRef.current = [];
    userMessageCountRef.current = 0;
    setMessageCount(0);
    setScores(DEFAULT_SCORES);
    setSuggestions([]);
    setOverallScore(0);
    setIsAnalyzing(false);
  }, []);

  return {
    scores,
    suggestions,
    overallScore,
    messageCount,
    isAnalyzing,
    addMessage,
    analyze,
    reset,
  };
};
