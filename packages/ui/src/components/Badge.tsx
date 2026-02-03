interface BadgeProps {
  variant: 'status' | 'priority' | 'type' | 'label';
  value: string;
  className?: string;
}

const statusStyles: Record<string, string> = {
  open: "bg-green-500/15 text-green-500",
  closed: "bg-gray-500/15 text-gray-400",
};

const priorityStyles: Record<string, string> = {
  high: "bg-priority-high/15 text-red-400",
  medium: "bg-priority-medium/15 text-amber-400",
  low: "bg-priority-low/15 text-green-400",
};

const typeStyles: Record<string, string> = {
  bug: "bg-red-500/15 text-red-400",
  feature: "bg-blue-500/15 text-blue-400",
  enhancement: "bg-purple-500/15 text-purple-400",
};

export function Badge({ variant, value, className = '' }: BadgeProps) {
  const normalizedValue = value.toLowerCase();
  
  let style = '';
  
  switch (variant) {
    case 'status':
      style = statusStyles[normalizedValue] || statusStyles.open;
      break;
    case 'priority':
      style = priorityStyles[normalizedValue] || '';
      break;
    case 'type':
      style = typeStyles[normalizedValue] || "bg-purple-500/15 text-purple-400";
      break;
    case 'label':
      style = "bg-surface-elevated text-text-secondary";
      break;
  }
  
  return (
    <span className={`inline-block px-2 py-0.5 rounded text-[11px] font-medium ${style} ${className}`}>
      {normalizedValue}
    </span>
  );
}
