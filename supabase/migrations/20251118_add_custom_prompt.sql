-- Add custom_prompt field to personas table
ALTER TABLE personas ADD COLUMN IF NOT EXISTS custom_prompt TEXT;

-- Add comment
COMMENT ON COLUMN personas.custom_prompt IS 'Custom system prompt for the persona. If set, overrides the default generated prompt.';
