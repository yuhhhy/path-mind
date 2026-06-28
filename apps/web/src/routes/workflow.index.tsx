import { createFileRoute } from '@tanstack/react-router';
import { WorkflowIndexPage } from './workflow';

export const Route = createFileRoute('/workflow/')({
  component: WorkflowIndexPage,
});
