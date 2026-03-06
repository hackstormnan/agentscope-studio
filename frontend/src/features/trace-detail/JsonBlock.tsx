import styles from './TraceDetail.module.css';

interface JsonBlockProps {
  value: unknown;
  maxHeight?: number;
}

export function JsonBlock({ value, maxHeight = 220 }: JsonBlockProps) {
  const text =
    value === undefined
      ? 'undefined'
      : JSON.stringify(value, null, 2);

  return (
    <pre className={styles.codeBlock} style={{ maxHeight }}>
      {text}
    </pre>
  );
}
