-- Add sub_scores_feedback column to competency_scores table for Sprint 3
ALTER TABLE competency_scores
ADD COLUMN IF NOT EXISTS sub_scores_feedback JSONB DEFAULT NULL;

COMMENT ON COLUMN competency_scores.sub_scores_feedback IS 'Detailed feedback for each sub-score criterion with descriptions';