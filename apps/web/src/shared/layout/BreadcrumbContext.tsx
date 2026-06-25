import { createContext, useContext, useEffect, useRef } from 'react';

export interface BreadcrumbItem {
  label: string;
  href?: string;
}

interface BreadcrumbContextValue {
  push: (id: number, items: BreadcrumbItem[]) => void;
  update: (id: number, items: BreadcrumbItem[]) => void;
  pop: (id: number) => void;
}

export const BreadcrumbContext = createContext<BreadcrumbContextValue>({
  push: () => {},
  update: () => {},
  pop: () => {},
});

let nextId = 0;

export function useBreadcrumb(items: BreadcrumbItem[]) {
  const ctx = useContext(BreadcrumbContext);
  const idRef = useRef<number | null>(null);
  const serialized = JSON.stringify(items);

  useEffect(() => {
    const parsed = JSON.parse(serialized) as BreadcrumbItem[];
    if (idRef.current === null) {
      idRef.current = ++nextId;
      ctx.push(idRef.current, parsed);
    } else {
      ctx.update(idRef.current, parsed);
    }
    return () => {
      if (idRef.current !== null) {
        ctx.pop(idRef.current);
        idRef.current = null;
      }
    };
  }, [serialized, ctx]);
}
