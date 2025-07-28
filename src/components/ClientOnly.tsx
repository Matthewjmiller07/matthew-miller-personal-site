import { useEffect, useState } from 'react';
import type { ReactNode } from 'react';

type ClientOnlyProps = {
  children: ReactNode | (() => ReactNode);
  fallback?: ReactNode;
};

export default function ClientOnly({ children, fallback = null }: ClientOnlyProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return <>{fallback}</>;
  }

  return <>{typeof children === 'function' ? children() : children}</>;
}
