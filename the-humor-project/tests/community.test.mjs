import assert from 'node:assert/strict';
import test from 'node:test';
import { dailyPrompt, validateSubmission } from '../utils/community.ts';

function form(values = {}) {
  const data = new FormData();
  for (const [key, value] of Object.entries({ prompt: 'Write a short caption about Butler.', topic: 'Campus', mode: 'draft', ...values })) data.set(key, value);
  return data;
}

test('drafts accept a prompt without AI output or sharing consent', () => {
  const result = validateSubmission(form());
  assert.equal(result.data.mode, 'draft');
  assert.equal(result.data.prompt, 'Write a short caption about Butler.');
  assert.equal(result.error, undefined);
});

test('AI generation accepts a prompt and consent without client-supplied output', () => {
  const result = validateSubmission(form({ mode: 'publish', prompt: ' Write a short caption about Butler. ', consent: 'yes' }));
  assert.equal(result.data.mode, 'publish');
  assert.equal(result.data.prompt, 'Write a short caption about Butler.');
  assert.equal(result.error, undefined);
});

test('invalid topics, modes, and prompt lengths are rejected', () => {
  for (const values of [{topic:'Other'}, {mode:'admin'}, {prompt:'short'}, {prompt:'x'.repeat(2001)}, {prompt:' '.repeat(20)}]) assert.ok(validateSubmission(form(values)).error);
});

test('AI publication requires explicit sharing consent', () => {
  for (const consent of ['', 'no', 'on']) assert.ok(validateSubmission(form({mode:'publish',consent})).error);
});

test('daily prompt is stable within a UTC day and rotates next day', () => {
  const morning = dailyPrompt(new Date('2026-10-05T00:00:00Z'));
  assert.equal(dailyPrompt(new Date('2026-10-05T23:59:59Z')), morning);
  assert.notEqual(dailyPrompt(new Date('2026-10-06T00:00:00Z')), morning);
});
