
export enum AnalysisDecision {
  DEFERIDO = 'DEFERIDO',
  INDEFERIDO = 'INDEFERIDO',
}

export interface AnalysisResult {
  status: AnalysisDecision;
  summary: string;
  issues: string[];
}
