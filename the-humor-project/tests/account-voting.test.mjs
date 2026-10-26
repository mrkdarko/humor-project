import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import test from 'node:test';
import { runInNewContext } from 'node:vm';
import ts from 'typescript';

const require = createRequire(import.meta.url);

// Run the actual client components with controlled auth, location, and hook state.
function componentHarness(path, name, { auth = {}, origin = 'http://localhost:3000', ownVote = 0, pending = false } = {}) {
  const states = [];
  const navigations = [];
  let cursor = 0;
  const action = () => {};
  const testModule = { exports: {} };
  const source = readFileSync(new URL(path, import.meta.url), 'utf8');
  const { outputText } = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX },
  });
  runInNewContext(outputText, {
    module: testModule,
    exports: testModule.exports,
    window: { location: { origin, assign: url => navigations.push(url) } },
    require: id => {
      if (id === 'react') return {
        useState: initial => {
          const index = cursor++;
          if (!(index in states)) states[index] = initial;
          return [states[index], value => { states[index] = value; }];
        },
        useActionState: () => [{}, action, pending],
      };
      if (id === '@/utils/supabase/client') return { createClient: () => ({ auth }) };
      if (id === './actions') return { voteCaption: action };
      return require(id);
    },
  });
  return {
    navigations,
    render: props => {
      cursor = 0;
      return testModule.exports[name]({ id: 'caption-id', upvotes: 0, downvotes: 0, ownVote, ...props });
    },
  };
}

function nodes(node, type) {
  if (Array.isArray(node)) return node.flatMap(child => nodes(child, type));
  if (!node || typeof node !== 'object') return [];
  return [...(node.type === type ? [node] : []), ...nodes(node.props?.children, type)];
}

test('Google always requests an account chooser and the exact callback for each environment', async () => {
  for (const origin of ['http://localhost:3000', 'https://the-humor-project-kwabena5.vercel.app']) {
    let options;
    const harness = componentHarness('../app/auth/google-button.tsx', 'GoogleButton', {
      origin,
      auth: { signInWithOAuth: async request => { options = request; return { error: null }; } },
    });
    await nodes(harness.render(), 'button')[0].props.onClick();
    assert.equal(options.provider, 'google');
    assert.equal(options.options.redirectTo, `${origin}/auth/callback`);
    assert.equal(options.options.queryParams.prompt, 'select_account');
  }
});

test('successful sign-out clears only this session and performs a full navigation', async () => {
  let scope;
  const harness = componentHarness('../app/sign-out-button.tsx', 'SignOutButton', {
    auth: { signOut: async options => { scope = options.scope; return { error: null }; } },
  });
  await nodes(harness.render(), 'button')[0].props.onClick();
  assert.equal(scope, 'local');
  assert.deepEqual(harness.navigations, ['http://localhost:3000']);
});

test('failed sign-out never pretends to switch accounts and allows retrying', async () => {
  for (const throws of [false, true]) {
    const harness = componentHarness('../app/sign-out-button.tsx', 'SignOutButton', {
      auth: { signOut: async () => {
        if (throws) throw new Error('Offline');
        return { error: new Error('Sign-out failed') };
      } },
    });
    await nodes(harness.render(), 'button')[0].props.onClick();
    const tree = harness.render();
    assert.deepEqual(harness.navigations, []);
    assert.equal(nodes(tree, 'button')[0].props.disabled, false);
    assert.equal(nodes(tree, 'p')[0].props.role, 'alert');
  }
});

test('own and other players captions allow voting, changing votes, and removing votes', () => {
  for (const isOwnCaption of [false, true]) {
  for (const ownVote of [0, 1, -1]) {
    const harness = componentHarness('../app/dashboard/vote-controls.tsx', 'VoteControls', { ownVote });
    const tree = harness.render({ isOwnCaption });
    assert.equal(nodes(tree, 'input')[0].props.name, 'caption_id');
    const buttons = nodes(tree, 'button');
    buttons.forEach((button, index) => {
      const value = index === 0 ? 1 : -1;
      assert.equal(button.props.type, 'submit');
      assert.equal(button.props.name, 'value');
      assert.equal(button.props.value, ownVote === value ? 0 : value);
      assert.equal(button.props.disabled, false);
      assert.equal(button.props['aria-pressed'], ownVote === value);
      assert.ok(!button.props['aria-label'].includes('unavailable'));
      assert.equal(button.props.title, ownVote === value ? `Remove ${index === 0 ? 'upvote' : 'downvote'}` : index === 0 ? 'Upvote' : 'Downvote');
    });
  }
  }
});

test('both own and other players vote buttons are disabled only while saving', () => {
  for (const isOwnCaption of [false, true]) {
    const harness = componentHarness('../app/dashboard/vote-controls.tsx', 'VoteControls', { pending: true });
    const tree = harness.render({ isOwnCaption });
    nodes(tree, 'button').forEach(button => assert.equal(button.props.disabled, true));
  }
});
