// Recent activity component
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  Target, 
  Trophy, 
  MessageSquare, 
  Swords,
  Clock
} from 'lucide-react';

export function RecentActivity() {
  const activities = [
    {
      id: '1',
      type: 'level_completed',
      title: 'Completed Level 5',
      description: 'NoFap Journey',
      timestamp: '2 hours ago',
      icon: <Target className="h-4 w-4 text-green-600" />,
    },
    {
      id: '2',
      type: 'battle_won',
      title: 'Won Battle',
      description: 'vs @challenger123',
      timestamp: '1 day ago',
      icon: <Trophy className="h-4 w-4 text-yellow-600" />,
    },
    {
      id: '3',
      type: 'forum_reply',
      title: 'Replied to thread',
      description: 'How to stay motivated',
      timestamp: '2 days ago',
      icon: <MessageSquare className="h-4 w-4 text-blue-600" />,
    },
    {
      id: '4',
      type: 'battle_started',
      title: 'Started new battle',
      description: 'Sugar Free Challenge',
      timestamp: '3 days ago',
      icon: <Swords className="h-4 w-4 text-crave-orange" />,
    },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle>Recent Activity</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {activities.map((activity) => (
            <div key={activity.id} className="flex items-start space-x-3">
              <div className="flex-shrink-0">
                {activity.icon}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground">
                  {activity.title}
                </p>
                <p className="text-sm text-muted-foreground">
                  {activity.description}
                </p>
                <div className="flex items-center space-x-1 mt-1">
                  <Clock className="h-3 w-3 text-muted-foreground" />
                  <span className="text-xs text-muted-foreground">
                    {activity.timestamp}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}