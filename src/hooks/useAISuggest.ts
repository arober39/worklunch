import { useMutation } from '@tanstack/react-query';
import { useAuthStore } from '@/stores/authStore';

const AI_BACKEND_URL =
  process.env.EXPO_PUBLIC_AI_BACKEND_URL || 'http://localhost:8000';

interface ActivePostPayload {
  id: string;
  title: string;
  description: string;
  category: string;
  user_name: string;
}

interface SuggestPayload {
  title: string;
  description?: string;
  category?: string;
  dietary_preferences?: string;
  allergies?: string;
  active_posts: ActivePostPayload[];
  ai_suggest_flag_value: boolean;
}

interface MatchedPost {
  post_id: string;
  title: string;
  reason: string;
}

interface SuggestResponse {
  suggested_description: string;
  matched_posts: MatchedPost[];
}

export function useAISuggest() {
  const { user } = useAuthStore();

  return useMutation({
    mutationFn: async (payload: SuggestPayload): Promise<SuggestResponse> => {
      if (!user) throw new Error('Must be logged in');

      const response = await fetch(`${AI_BACKEND_URL}/api/v1/suggest`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(error || 'AI suggestion failed');
      }

      return response.json();
    },
  });
}

export type { MatchedPost, SuggestResponse };
