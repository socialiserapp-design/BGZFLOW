// A native host's SUCCESS field is transport status, not proof its task ran.
export function inspectAntigravityResult(response, exitCode) {
  const denied = Array.isArray(response?.denied_actions)
    ? response.denied_actions.map(item => ({
      action: typeof item?.action === 'string' ? item.action : 'unknown',
      name: typeof item?.display_name === 'string' ? item.display_name : 'unknown',
    })) : [];
  if (denied.length) return { usable: false, reason: 'permission-required', denied };
  if (exitCode !== 0 || response?.status !== 'SUCCESS') {
    return { usable: false, reason: 'native-turn-failed', denied };
  }
  if (typeof response?.response !== 'string' || !response.response.trim()) {
    return { usable: false, reason: 'no-answer', denied };
  }
  return { usable: true, reason: 'answer-available', denied };
}
