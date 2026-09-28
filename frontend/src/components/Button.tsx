import type { ReactNode } from 'react';

interface Props {
  children: ReactNode;
  onClick?: () => void;
  variant?: 'primary' | 'danger' | 'secondary';
  disabled?: boolean;
}

export default function Button({
  children,
  onClick,
  variant = 'primary',
  disabled,
}: Props) {
  const colors = {
    primary: '#2563eb',
    danger: '#dc2626',
    secondary: '#64748b',
  };
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        background: colors[variant],
        color: '#fff',
        border: 'none',
        padding: '8px 16px',
        borderRadius: 6,
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.5 : 1,
        fontSize: 14,
      }}
    >
      {children}
    </button>
  );
}