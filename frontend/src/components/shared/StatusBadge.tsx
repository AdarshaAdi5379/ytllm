import { cn } from '../../utils/cn';

type Status = 'loading' | 'ready' | 'error';

const labels: Record<Status, string> = {
  loading: 'Loading',
  ready: 'Ready',
  error: 'Error',
};

const styles: Record<Status, string> = {
  loading: 'bg-yellow-100 text-yellow-800',
  ready: 'bg-green-100 text-green-800',
  error: 'bg-red-100 text-red-800',
};

interface Props {
  status: Status;
  className?: string;
}

export function StatusBadge({ status, className }: Props) {
  return (
    <span className={cn('inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium', styles[status], className)}>
      {status === 'loading' && (
        <span className="mr-1 w-2 h-2 rounded-full bg-yellow-500 animate-pulse" />
      )}
      {labels[status]}
    </span>
  );
}
