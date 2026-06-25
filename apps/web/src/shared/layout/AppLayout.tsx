import { Link, useRouterState } from '@tanstack/react-router';
import { BookOpen, LayoutDashboard, PanelLeft } from 'lucide-react';
import { type ReactNode, useState } from 'react';

interface AppLayoutProps {
  children: ReactNode;
}

const navItems = [
  { to: '/', label: '工作台', icon: LayoutDashboard },
  { to: '/goals', label: '学习目标', icon: BookOpen },
];

export function AppLayout({ children }: AppLayoutProps) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const [collapsed, setCollapsed] = useState(false);

  return (
    <div className="flex h-dvh bg-white">
      <aside
        className={
          'flex shrink-0 flex-col border-r border-gray-200 bg-white transition-all duration-200 ' +
          (collapsed ? 'w-14' : 'w-60')
        }
      >
        <div className="flex h-14 items-center justify-between px-3.5">
          {!collapsed && (
            <span className="bg-gradient-to-r from-blue-600 to-violet-500 bg-clip-text text-[17px] font-bold tracking-tight text-transparent">
              PathMind
            </span>
          )}
          <button
            aria-label={collapsed ? '展开侧边栏' : '折叠侧边栏'}
            className={
              'flex h-7 w-7 items-center justify-center rounded-md text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-700 ' +
              (collapsed ? 'mx-auto' : '')
            }
            onClick={() => setCollapsed((c) => !c)}
            type="button"
          >
            <PanelLeft size={16} />
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto px-2 py-2 space-y-0.5">
          {navItems.map(({ to, label, icon: Icon }) => {
            const isActive = to === '/' ? pathname === '/' : pathname.startsWith(to);
            return (
              <Link
                key={to}
                to={to}
                title={collapsed ? label : undefined}
                className={
                  'flex items-center gap-2.5 rounded-md px-2.5 py-2 text-sm font-medium transition-colors ' +
                  (collapsed ? 'justify-center' : '') +
                  ' ' +
                  (isActive
                    ? 'bg-blue-50 text-blue-700'
                    : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900')
                }
              >
                <Icon size={16} className="shrink-0" />
                {!collapsed && label}
              </Link>
            );
          })}
        </nav>

        <div className="px-2 py-3">
          <div
            className={
              'flex items-center gap-3 rounded-md px-2.5 py-2.5 hover:bg-gray-100 cursor-pointer transition-colors ' +
              (collapsed ? 'justify-center' : '')
            }
            title={collapsed ? 'Personal · deshengl331@gmail.com' : undefined}
          >
            <div className="h-8 w-8 shrink-0 overflow-hidden rounded-md bg-gray-200">
              <img
                src="https://www.gravatar.com/avatar/0?d=mp&s=72"
                alt="avatar"
                className="h-full w-full object-cover"
              />
            </div>
            {!collapsed && (
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-gray-900">Personal</p>
                <p className="truncate text-xs text-gray-500">deshengl331@gmail.com</p>
              </div>
            )}
          </div>
        </div>
      </aside>

      <div className="flex flex-1 flex-col overflow-hidden">
        <header className="flex h-14 shrink-0 items-center bg-white px-6">
          <p className="text-sm text-slate-500">
            {pathname === '/' ? '工作台' : pathname.startsWith('/goals') ? '学习目标' : 'PathMind'}
          </p>
        </header>

        <main className="flex-1 overflow-y-auto bg-white">
          <div className="mx-auto max-w-5xl px-8 py-8">{children}</div>
        </main>
      </div>
    </div>
  );
}
