'use client';

interface ProgressPathProps {
  completed: number;
  total: number;
}

export function ProgressPath({ completed, total }: ProgressPathProps) {
  const percent = Math.min(100, Math.round((completed / Math.max(total, 1)) * 100));

  return (
    <div className="relative w-full h-3 rounded-full bg-gray-200">
      <div
        className="absolute left-0 top-0 h-full rounded-full bg-crave-orange transition-all"
        style={{ width: `${percent}%` }}
      />
      <div className="absolute inset-0 flex items-center justify-center text-xs font-medium text-muted-foreground">
        {completed} / {total} levels completed • {percent}%
      </div>
    </div>
  );
}



