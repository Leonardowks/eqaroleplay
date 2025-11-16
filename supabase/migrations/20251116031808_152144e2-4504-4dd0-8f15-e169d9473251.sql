-- Adicionar políticas RLS de DELETE para admins

-- Permitir admins deletarem session_messages
CREATE POLICY "Admins can delete messages"
ON session_messages FOR DELETE
USING (has_role(auth.uid(), 'admin'));

-- Permitir admins deletarem competency_scores
CREATE POLICY "Admins can delete scores"
ON competency_scores FOR DELETE
USING (has_role(auth.uid(), 'admin'));

-- Permitir admins deletarem user_achievements
CREATE POLICY "Admins can delete achievements"
ON user_achievements FOR DELETE
USING (has_role(auth.uid(), 'admin'));

-- Permitir admins deletarem user_insights
CREATE POLICY "Admins can delete insights"
ON user_insights FOR DELETE
USING (has_role(auth.uid(), 'admin'));

-- Permitir admins deletarem roleplay_sessions
CREATE POLICY "Admins can delete sessions"
ON roleplay_sessions FOR DELETE
USING (has_role(auth.uid(), 'admin'));