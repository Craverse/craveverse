'use client';

interface LevelNodeProps {
  levelNumber: number;
  title: string;
  status: 'completed' | 'current' | 'locked';
}

export function LevelNode({ levelNumber, title, status }: LevelNodeProps) {
  const baseStyles = 'w-full rounded-lg border p-4 transition shadow-sm';
  const statusStyles: Record<typeof status, string> = {
    completed: 'bg-green-50 border-green-200 text-green-700',
    current: 'bg-orange-50 border-orange-200 text-orange-700 animate-pulse',
    locked: 'bg-gray-50 border-gray-200 text-gray-500',
  };
  const statusMessages: Record<typeof status, string> = {
    completed: 'Completed – great job! You can revisit this challenge anytime.',
    current: 'Current challenge – focus here today.',
    locked: 'Locked – progress through earlier levels to unlock.',
  };
  const tooltip = `Level ${levelNumber}: ${title}\n${statusMessages[status]}`;

  return (
    <div
      className={`${baseStyles} ${statusStyles[status]}`}
      title={tooltip}
      aria-label={tooltip}
    >
      <div className="text-xs uppercase tracking-wide mb-1">Level {levelNumber}</div>
      <div className="font-semibold text-sm">{title}</div>
      <div className="mt-2 text-xs flex items-center gap-1">
        {status === 'completed' && <span>Completed ✅</span>}
        {status === 'current' && <span>Current 🔥</span>}
        {status === 'locked' && <span>Locked 🔒</span>}
      </div>
      <p className="mt-2 text-[11px] leading-snug opacity-80">
        {statusMessages[status]}
      </p>
    </div>
  );
}



