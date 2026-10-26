import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { runInNewContext } from 'node:vm';
import ts from 'typescript';
import * as community from '../utils/community.ts';
import * as media from '../utils/meme-media.ts';
import { ImageInputError, parsePhotoCaption } from '../utils/meme-image.ts';

function actionHarness({ signedIn = true, downloadFails = false, uploadFails = false, publishFails = false, cleanupThrows = false, aiText = '{"caption":"Midterms mood","alt":"A crowded library"}' } = {}) {
  const calls = { uploads: [], removals: [], publications: [], revalidations: [], ai: [] };
  const bucket = {
    upload: async (...args) => { calls.uploads.push(args); return { error: uploadFails ? { name: 'StorageError' } : null }; },
    remove: async paths => { calls.removals.push(paths); if (cleanupThrows) throw new Error('Offline'); return { error: null }; },
  };
  const supabase = {
    auth: { getUser: async () => ({ data: { user: signedIn ? { id: 'user-id' } : null } }) },
    storage: { from: name => { assert.equal(name, 'meme-images'); return bucket; } },
    rpc: async (name, args) => { calls.publications.push({ name, args }); return { error: publishFails ? { code: '42501' } : null }; },
  };
  const testModule = { exports: {} };
  const { outputText } = ts.transpileModule(readFileSync(new URL('../app/dashboard/actions.ts', import.meta.url), 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS } });
  runInNewContext(outputText, {
    module: testModule, exports: testModule.exports, Buffer, crypto, console: { error: () => {} },
    process: { env: { GEMINI_API_KEY: 'test-key' } },
    require: id => {
      if (id === 'next/cache') return { revalidatePath: path => calls.revalidations.push(path) };
      if (id === '@/utils/supabase/server') return { createClient: async () => supabase };
      if (id === '@/utils/community') return community;
      if (id === '@/utils/meme-media') return media;
      if (id === '@/utils/meme-image') return {
        ImageInputError, parsePhotoCaption,
        fetchRemoteImage: async () => { if (downloadFails) throw new Error('DNS unavailable'); return Buffer.from('downloaded photo'); },
        normalizeImage: async () => ({ bytes: Buffer.from('normalized photo'), width: 800, height: 600 }),
      };
      if (id === '@google/genai') return { GoogleGenAI: class {
        models = { generateContent: async options => { calls.ai.push(options); return { text: aiText }; } };
      } };
      throw new Error(`Unexpected import: ${id}`);
    },
  });
  return { calls, submit: form => testModule.exports.submitGeneration({}, form) };
}

function photoForm(source = 'upload') {
  const form = new FormData();
  Object.entries({ mode: 'publish', topic: 'Campus', prompt: 'Write a meme about finals week.', consent: 'yes', post_type: 'photo', image_source: source, image_url: 'https://example.com/photo.jpg' }).forEach(([key, value]) => form.set(key, value));
  if (source === 'upload') form.set('image_file', new File(['image'], 'photo.png', { type: 'image/png' }));
  return form;
}

test('uploads and image links pass actual image bytes to AI and publish the caption with a storage reference', async () => {
  for (const source of ['upload', 'link']) {
    const harness = actionHarness();
    const result = await harness.submit(photoForm(source));
    assert.ok(result.success);
    assert.ok(result.resetKey);
    assert.equal(harness.calls.ai[0].contents[0].inlineData.data, Buffer.from('normalized photo').toString('base64'));
    assert.equal(harness.calls.uploads[0][2].upsert, false);
    assert.equal(harness.calls.publications[0].name, 'publish_photo_caption');
    const args = harness.calls.publications[0].args;
    assert.match(args.p_image_path, /^user-id\/.+\.jpg$/);
    assert.equal(args.p_content, 'Midterms mood');
    assert.equal(args.p_image_alt, 'A crowded library');
    assert.equal(args.p_prompt, 'Write a meme about finals week.');
    assert.equal(args.p_image_width, 800);
    assert.equal(args.p_image_height, 600);
    assert.deepEqual(harness.calls.revalidations, ['/dashboard']);
    assert.equal(harness.calls.removals.length, 0);
  }
});

test('signed-out users cannot call AI, upload, or publish', async () => {
  const harness = actionHarness({ signedIn: false });
  assert.ok((await harness.submit(photoForm())).error);
  assert.equal(harness.calls.ai.length + harness.calls.uploads.length + harness.calls.publications.length, 0);
});

test('no photo is uploaded or published when AI returns an invalid or blocked response', async () => {
  for (const aiText of ['', '{}', 'null']) {
    const harness = actionHarness({ aiText });
    assert.ok((await harness.submit(photoForm())).error);
    assert.equal(harness.calls.uploads.length + harness.calls.publications.length, 0);
  }
});

test('upload failure never creates a database post', async () => {
  const harness = actionHarness({ uploadFails: true });
  assert.match((await harness.submit(photoForm())).error, /photo could not be saved/);
  assert.equal(harness.calls.publications.length, 0);
});

test('an unreachable image link gives an actionable error without calling AI', async () => {
  const harness = actionHarness({ downloadFails: true });
  assert.match((await harness.submit(photoForm('link'))).error, /Try uploading it instead/);
  assert.equal(harness.calls.ai.length + harness.calls.uploads.length + harness.calls.publications.length, 0);
});

test('failed publication cleans up the unused upload without masking a cleanup outage', async () => {
  for (const cleanupThrows of [false, true]) {
    const harness = actionHarness({ publishFails: true, cleanupThrows });
    assert.match((await harness.submit(photoForm())).error, /could not be published/);
    assert.equal(harness.calls.removals.length, 1);
    assert.equal(harness.calls.removals[0][0], harness.calls.uploads[0][0]);
    assert.equal(harness.calls.revalidations.length, 0);
  }
});
