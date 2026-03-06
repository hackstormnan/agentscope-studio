interface ErrorStateProps {
  title?: string;
  message: string;
  onRetry?: () => void;
}

export function ErrorState({
  title = 'Something went wrong',
  message,
  onRetry,
}: ErrorStateProps) {
  return (
    <div className="error-state">
      <div className="error-state-icon">⚠</div>
      <div className="error-state-title">{title}</div>
      <div className="error-state-message">{message}</div>
      {onRetry && (
        <button className="btn btn-secondary btn-sm" style={{ marginTop: 16 }} onClick={onRetry}>
          Retry
        </button>
      )}
    </div>
  );
}
