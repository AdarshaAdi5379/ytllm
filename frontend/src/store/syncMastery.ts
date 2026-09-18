import { useProgressStore } from './useProgressStore';
import { useDailyRevisionStore } from './useDailyRevisionStore';
import { useWorkspaceStore } from './useWorkspaceStore';

/**
 * Notifies all relevant stores that TopicMastery has been updated
 * (e.g. following a flashcard review, quiz submission, or mentor session).
 * Automatically refreshes Progress and Daily Revision data without full page reloads.
 */
export function notifyMasteryUpdated(workspaceId?: string) {
  const wsId = workspaceId || useWorkspaceStore.getState().activeWorkspaceId;
  if (!wsId) return;

  // Refresh progress dashboard if already loaded
  if (useProgressStore.getState().dashboard) {
    useProgressStore.getState().loadDashboard(wsId).catch(() => {});
  }

  // Refresh daily revision summary if already loaded
  if (useDailyRevisionStore.getState().summary) {
    useDailyRevisionStore.getState().loadSummary(wsId).catch(() => {});
  }
}
