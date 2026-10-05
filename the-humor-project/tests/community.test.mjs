import assert from 'node:assert/strict';
import test from 'node:test';
import { dailyPrompt, validateSubmission } from '../utils/community.ts';

function form(values = {}) {
  const data = new FormData();
  for (const [key, value] of Object.entries({ prompt: 'Write a short caption about Butler.', topic: 'Campus', mode: 'draft', ...values })) data.set(key, value);
  return data;
}

test('drafts accept a prompt without an AI output', () => {
  const result = validateSubmission(form());
  assert.equal(result.data.mode, 'draft');
  assert.equal(result.data.content, '');
});

test('publishing records the actual prompt, AI tool, and caption', () => {
  const result = validateSubmission(form({ mode: 'publish', content: ' A caption. ', provider: ' Gemini ', consent: 'yes' }));
  assert.equal(result.data.content, 'A caption.');
  assert.equal(result.data.provider, 'Gemini');
});

test('invalid topics, modes, and prompt lengths are rejected', () => {
  for (const values of [{topic:'Other'}, {mode:'admin'}, {prompt:'short'}, {prompt:'x'.repeat(2001)}, {prompt:' '.repeat(20)}]) assert.ok(validateSubmission(form(values)).error);
});

test('published captions require an output, model, and sharing consent', () => {
  const valid = { mode:'publish', content:'A caption', provider:'Gemini', consent:'yes' };
  for (const values of [{content:''}, {content:'x'.repeat(501)}, {provider:''}, {provider:'x'.repeat(81)}, {consent:''}]) assert.ok(validateSubmission(form({...valid,...values})).error);
});

test('daily prompt is stable within a UTC day and rotates next day', () => {
  const morning = dailyPrompt(new Date('2026-10-05T00:00:00Z'));
  assert.equal(dailyPrompt(new Date('2026-10-05T23:59:59Z')), morning);
  assert.notEqual(dailyPrompt(new Date('2026-10-06T00:00:00Z')), morning);
});
