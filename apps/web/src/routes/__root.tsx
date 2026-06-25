import { Outlet, createRootRoute } from '@tanstack/react-router';
import { AppLayout } from '../shared/layout/AppLayout';

export const Route = createRootRoute({
  component: () => (
    <AppLayout>
      <Outlet />
    </AppLayout>
  ),
});
