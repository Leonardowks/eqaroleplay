import { useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';
import AchievementBadge from './AchievementBadge';
import { supabase } from '@/integrations/supabase/client';

interface AchievementNotificationProps {
  newAchievementIds: string[];
}

const AchievementNotification = ({ newAchievementIds }: AchievementNotificationProps) => {
  const { toast } = useToast();

  useEffect(() => {
    const showAchievementToasts = async () => {
      if (newAchievementIds.length === 0) return;

      // Buscar definições dos achievements
      const { data: achievements } = await supabase
        .from('achievement_definitions')
        .select('*')
        .in('id', newAchievementIds);

      if (!achievements) return;

      // Mostrar toast para cada achievement desbloqueado
      achievements.forEach((achievement, index) => {
        setTimeout(() => {
          toast({
            title: '🎉 Achievement Desbloqueado!',
            description: (
              <div className="mt-2">
                <AchievementBadge
                  achievementId={achievement.id}
                  name={achievement.name}
                  description={achievement.description}
                  icon={achievement.icon}
                  category={achievement.category as 'milestone' | 'performance' | 'consistency' | 'mastery'}
                  badgeColor={achievement.badge_color}
                  rewardPoints={achievement.reward_points}
                  size="sm"
                  showPoints={true}
                />
              </div>
            ),
            duration: 5000,
          });
        }, index * 1000); // Espaçar toasts por 1 segundo
      });
    };

    showAchievementToasts();
  }, [newAchievementIds, toast]);

  return null; // Componente não renderiza nada visualmente
};

export default AchievementNotification;
