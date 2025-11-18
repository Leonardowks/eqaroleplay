-- ========================================
-- Admin Settings Tables
-- Sistema de configuração para white-label
-- ========================================

-- Tabela de configurações gerais do sistema
CREATE TABLE IF NOT EXISTS system_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text UNIQUE NOT NULL,
  value jsonb NOT NULL,
  description text,
  category text DEFAULT 'general',
  is_public boolean DEFAULT false, -- Se pode ser acessado sem auth
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Tabela de API keys (com suporte a criptografia)
CREATE TABLE IF NOT EXISTS api_configurations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider text UNIQUE NOT NULL, -- 'openai', 'elevenlabs', 'lovable'
  api_key text NOT NULL, -- Em produção, usar pgcrypto para criptografar
  display_name text NOT NULL,
  is_active boolean DEFAULT true,
  last_tested_at timestamptz,
  test_status text, -- 'success', 'failed', 'pending'
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Tabela de branding/personalização visual
CREATE TABLE IF NOT EXISTS branding (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_name text NOT NULL DEFAULT 'EQA',
  app_name text NOT NULL DEFAULT 'Roleplay',
  tagline text DEFAULT 'Treinamento com IA',
  logo_url text,
  favicon_url text,
  -- Cores em formato HSL (ex: '213 100% 50%')
  primary_color text DEFAULT '213 100% 50%',
  secondary_color text DEFAULT '262 80% 65%',
  accent_color text DEFAULT '174 100% 50%',
  background_color text DEFAULT '222 47% 11%',
  -- Meta tags
  meta_description text DEFAULT 'Plataforma de treinamento com IA',
  meta_keywords text,
  -- Social
  og_image_url text,
  twitter_handle text,
  -- Footer
  footer_text text,
  copyright_text text,
  -- Contato
  support_email text,
  support_phone text,
  website_url text,
  -- Timestamps
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Tabela de feature flags
CREATE TABLE IF NOT EXISTS feature_flags (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  feature_key text UNIQUE NOT NULL,
  display_name text NOT NULL,
  description text,
  is_enabled boolean DEFAULT true,
  config jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS em todas as tabelas
ALTER TABLE system_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE api_configurations ENABLE ROW LEVEL SECURITY;
ALTER TABLE branding ENABLE ROW LEVEL SECURITY;
ALTER TABLE feature_flags ENABLE ROW LEVEL SECURITY;

-- Policies: Apenas admins podem gerenciar configurações
CREATE POLICY "Admins can manage system settings"
ON system_settings FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'admin'))
WITH CHECK (has_role(auth.uid(), 'admin'));

CREATE POLICY "Public settings are readable by all"
ON system_settings FOR SELECT
TO authenticated
USING (is_public = true);

CREATE POLICY "Admins can manage API configurations"
ON api_configurations FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'admin'))
WITH CHECK (has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can manage branding"
ON branding FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'admin'))
WITH CHECK (has_role(auth.uid(), 'admin'));

CREATE POLICY "Anyone can view branding"
ON branding FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Admins can manage feature flags"
ON feature_flags FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'admin'))
WITH CHECK (has_role(auth.uid(), 'admin'));

CREATE POLICY "Anyone can view feature flags"
ON feature_flags FOR SELECT
TO authenticated
USING (true);

-- Trigger para updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_system_settings_updated_at ON system_settings;
CREATE TRIGGER update_system_settings_updated_at
  BEFORE UPDATE ON system_settings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_api_configurations_updated_at ON api_configurations;
CREATE TRIGGER update_api_configurations_updated_at
  BEFORE UPDATE ON api_configurations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_branding_updated_at ON branding;
CREATE TRIGGER update_branding_updated_at
  BEFORE UPDATE ON branding
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_feature_flags_updated_at ON feature_flags;
CREATE TRIGGER update_feature_flags_updated_at
  BEFORE UPDATE ON feature_flags
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Inserir dados padrão

-- Branding padrão
INSERT INTO branding (company_name, app_name, tagline, meta_description)
VALUES ('EQA', 'Roleplay', 'Treinamento de Vendas com IA', 'Plataforma de treinamento de vendas usando inteligência artificial e metodologia SPIN Selling')
ON CONFLICT DO NOTHING;

-- Feature flags padrão
INSERT INTO feature_flags (feature_key, display_name, description, is_enabled) VALUES
('voice_chat', 'Chat por Voz', 'Permite sessões de roleplay por voz com IA', true),
('text_chat', 'Chat por Texto', 'Permite sessões de roleplay por texto', true),
('ranking', 'Ranking', 'Exibe ranking de usuários', true),
('achievements', 'Conquistas', 'Sistema de gamificação com achievements', true),
('pdf_export', 'Exportar PDF', 'Permite exportar relatórios em PDF', true),
('elevenlabs_voices', 'Vozes ElevenLabs', 'Usar vozes do ElevenLabs para personas', false)
ON CONFLICT (feature_key) DO NOTHING;

-- API configurations padrão (sem keys, admin precisa configurar)
INSERT INTO api_configurations (provider, api_key, display_name, is_active) VALUES
('openai', '', 'OpenAI API', false),
('elevenlabs', '', 'ElevenLabs API', false),
('lovable', '', 'Lovable API', false)
ON CONFLICT (provider) DO NOTHING;

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_system_settings_key ON system_settings(key);
CREATE INDEX IF NOT EXISTS idx_system_settings_category ON system_settings(category);
CREATE INDEX IF NOT EXISTS idx_feature_flags_key ON feature_flags(feature_key);

-- Comentários
COMMENT ON TABLE system_settings IS 'Configurações gerais do sistema';
COMMENT ON TABLE api_configurations IS 'Chaves de API para integrações externas';
COMMENT ON TABLE branding IS 'Configurações de marca e visual do sistema';
COMMENT ON TABLE feature_flags IS 'Flags para habilitar/desabilitar funcionalidades';

SELECT 'Admin settings tables created successfully!' as status;
