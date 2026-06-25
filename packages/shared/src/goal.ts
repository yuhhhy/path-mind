export type GoalStatus = 'active' | 'completed' | 'paused' | 'initializing';

export type GoalType = 'understand_concept' | 'prepare_interview' | 'build_project' | 'pass_exam';

export type TeachingStrategy =
  | 'first_principles'
  | 'step_by_step'
  | 'analogy'
  | 'case_based'
  | 'source_code_oriented';

export type OutputFormat = 'text' | 'flowchart' | 'mindmap' | 'table' | 'code_example';

export type AssessmentMethod = 'quiz' | 'teach_back' | 'practice_task' | 'interview_question';

export type LearningStepStatus = 'todo' | 'learning' | 'done';

export interface LearningConfig {
  teachingStrategy: TeachingStrategy;
  preferredOutputFormats: OutputFormat[];
  assessmentMethods: AssessmentMethod[];
}

export interface LearningStep {
  id: string;
  title: string;
  description: string;
  status: LearningStepStatus;
  estimatedMinutes: number;
}

export interface Goal {
  id: string;
  title: string;
  description: string;
  type: GoalType;
  status: GoalStatus;
  progress: number;
  estimatedMinutes: number;
  learningConfig: LearningConfig;
  finalOutcome: string[];
  steps: LearningStep[];
}
