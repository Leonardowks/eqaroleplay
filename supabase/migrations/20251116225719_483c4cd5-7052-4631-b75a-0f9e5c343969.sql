-- Corrigir constraint da tabela session_messages para aceitar 'assistant'
-- Isso resolve o erro de salvamento de mensagens do assistente

-- Remover constraint antigo
ALTER TABLE session_messages 
DROP CONSTRAINT IF EXISTS session_messages_role_check;

-- Adicionar novo constraint que aceita 'user', 'persona' e 'assistant'
ALTER TABLE session_messages 
ADD CONSTRAINT session_messages_role_check 
CHECK (role IN ('user', 'persona', 'assistant'));