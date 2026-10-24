import { useTheme } from '../theme';

export function Spinner() {
  const theme = useTheme();

  return (
    <span
      role="progressbar"
      aria-label="Loading"
      className="spinner"
      style={{
        width: 18,
        height: 18,
        border: `2px solid ${theme.hairline}`,
        borderTopColor: theme.mutedText,
        borderRadius: '50%',
      }}
    />
  );
}
