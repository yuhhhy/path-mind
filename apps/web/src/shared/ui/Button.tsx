import { Link } from '@tanstack/react-router';
import type { ComponentPropsWithoutRef, MouseEventHandler, ReactNode } from 'react';

type ButtonTone = 'primary' | 'secondary';
type ButtonSize = 'sm' | 'md';

const baseClassName =
  'inline-flex items-center rounded-md font-medium transition-colors cursor-pointer disabled:cursor-not-allowed';

const toneClassName: Record<ButtonTone, string> = {
  primary: 'bg-blue-600 text-white hover:bg-blue-700 disabled:bg-gray-100 disabled:text-gray-400',
  secondary:
    'border border-gray-300 bg-white text-gray-600 hover:bg-gray-50 disabled:border-gray-200 disabled:text-gray-300',
};

const sizeClassName: Record<ButtonSize, string> = {
  sm: 'h-7 gap-1 px-2.5 text-xs',
  md: 'h-9 gap-2 px-4 text-sm',
};

function joinClassNames(...classNames: Array<string | false | undefined>) {
  return classNames.filter(Boolean).join(' ');
}

interface ButtonProps extends ComponentPropsWithoutRef<'button'> {
  icon?: ReactNode;
  size?: ButtonSize;
  tone?: ButtonTone;
}

export function Button({
  children,
  className,
  icon,
  size = 'sm',
  tone = 'primary',
  type = 'button',
  ...props
}: ButtonProps) {
  return (
    <button
      className={joinClassNames(baseClassName, toneClassName[tone], sizeClassName[size], className)}
      type={type}
      {...props}
    >
      {icon}
      {children}
    </button>
  );
}

interface LinkButtonProps {
  children: ReactNode;
  className?: string;
  icon?: ReactNode;
  onClick?: MouseEventHandler<HTMLAnchorElement>;
  params?: Record<string, string>;
  size?: ButtonSize;
  title?: string;
  to: string;
  tone?: ButtonTone;
}

export function LinkButton({
  children,
  className,
  icon,
  onClick,
  params,
  size = 'sm',
  title,
  to,
  tone = 'primary',
}: LinkButtonProps) {
  const linkProps = { onClick, params, title, to } as ComponentPropsWithoutRef<typeof Link>;

  return (
    <Link
      className={joinClassNames(baseClassName, toneClassName[tone], sizeClassName[size], className)}
      {...linkProps}
    >
      {children}
      {icon}
    </Link>
  );
}
