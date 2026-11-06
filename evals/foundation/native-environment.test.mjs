import test from 'node:test';
import assert from 'node:assert/strict';
import {clearInheritedHostIdentity} from './native-environment.mjs';
test('evaluation child retains configured access but drops inherited host identity',()=>{
  const env={CODEX_HOME:'fixture-home',CODEX_API_KEY:'dummy-access',TYPESAFE_API_KEY:'dummy-routing',CODEX_CI:'1',CODEX_THREAD_ID:'old-thread',CODEX_APP_TOOLS_PIPE_PATH:'old-pipe',PATH:'fixture-path'};
  assert.deepEqual(clearInheritedHostIdentity(env),['CODEX_APP_TOOLS_PIPE_PATH','CODEX_CI','CODEX_THREAD_ID']);
  assert.deepEqual(Object.keys(env).sort(),['CODEX_API_KEY','CODEX_HOME','PATH','TYPESAFE_API_KEY']);
  assert.equal(env.TYPESAFE_API_KEY,'dummy-routing');
});
