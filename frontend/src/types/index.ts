export interface User {
  id: number;
  email: string;
  role: 'user' | 'admin';
  created_at: string;
}

export interface AuthResponse {
  user: User;
  token: string;
}

export type AnalysisStatus = 'pending' | 'completed' | 'failed';
export type Verdict = 'real' | 'synthetic';

export interface Analysis {
  id: number;
  filename: string;
  status: AnalysisStatus;
  verdict: Verdict | null;
  probability_synthetic: number | null;
  model_version: string | null;
  processing_time_ms: number | null;
  heatmap_url: string | null;
  created_at: string;
  cached?: boolean;
}

export interface HistoryResponse {
  items: Analysis[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    total_pages: number;
  };
}
