type SpinnerSize = 'sm' | 'md' | 'lg';

const sizeClasses: Record<SpinnerSize, string> = {
  sm: 'h-4 w-4 border-2',
  md: 'h-8 w-8 border-[3px]',
  lg: 'h-12 w-12 border-4',
};

export function Spinner({ size = 'md' }: { size?: SpinnerSize }) {
  return (
    <div
      className={`${sizeClasses[size]} border-primary-200 border-t-primary-700 rounded-full animate-spin`}
      role="status"
      aria-label="Завантаження"
    />
  );
}
