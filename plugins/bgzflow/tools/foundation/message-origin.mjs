// Known native composer-suggestion envelope. Ordinary quoted discussion is not
// matched: both the exact leading disclaimer and its composer explanation are
// required. Old immutable records are classified at read time as well.
const disclaimer = 'This is an app-generated request for a suggested next user message. The user did not write this message.';
export function isAppGeneratedSuggestion(value) {
  const message = typeof value === 'string' ? value : value?.message ?? value?.prompt ?? value?.user_prompt ?? value?.userPrompt;
  if (typeof message !== 'string') return false;
  const text = message.trimStart();
  return text.startsWith(disclaimer) && /^\s*Your suggestion will appear in the user[’']s empty message composer\b/.test(text.slice(disclaimer.length));
}
export const isHumanSource = event => event?.event === 'UserPromptSubmit' && event.messageOrigin !== 'app-generated-suggestion' && !isAppGeneratedSuggestion(event);
