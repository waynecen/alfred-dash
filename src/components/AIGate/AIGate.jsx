import { useAIHealth } from '../../hooks/useAI';
import { describeAIStatus } from '../../data/aiStatus';
import WidgetState from '../WidgetState/WidgetState';

// Shows an AI widget only when the AI assistant can be reached. Otherwise every AI widget says
// the same thing, with what to do about it and a way to check again, instead of failing when
// someone clicks.
function AIGate({ children }) {
  const health = useAIHealth();
  if (health.status === 'connected') return children;
  if (health.status === 'checking') return <WidgetState status="loading" message="Looking for the AI assistant…" />;
  const { label, note } = describeAIStatus(health.status);
  return (
    <WidgetState status="empty" message={`${label}. ${note}`}>
      <button type="button" onClick={health.recheck}>
        Check again
      </button>
    </WidgetState>
  );
}

export default AIGate;
