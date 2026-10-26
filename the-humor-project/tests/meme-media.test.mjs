import assert from 'node:assert/strict';
import test from 'node:test';
import sharp from 'sharp';
import { MAX_IMAGE_BYTES, parseImageUrl, validateMedia } from '../utils/meme-media.ts';
import { isPublicAddress, normalizeImage, parsePhotoCaption, resolveImageHost } from '../utils/meme-image.ts';

function form(values = {}) {
  const result = new FormData();
  Object.entries({ post_type: 'photo', mode: 'publish', image_source: 'upload', ...values }).forEach(([key, value]) => result.set(key, value));
  return result;
}

test('existing text posts do not require a photo', () => {
  assert.equal(validateMedia(new FormData()).data.kind, 'text');
  assert.ok(validateMedia(form({ post_type: 'other' })).error);
});

test('photo uploads require a supported nonempty file under the size limit', () => {
  assert.ok(validateMedia(form()).error);
  assert.ok(validateMedia(form({ image_file: new File([], 'empty.jpg', { type: 'image/jpeg' }) })).error);
  assert.ok(validateMedia(form({ image_file: new File(['<svg/>'], 'photo.svg', { type: 'image/svg+xml' }) })).error);
  assert.ok(validateMedia(form({ image_file: new File([new Uint8Array(MAX_IMAGE_BYTES + 1)], 'large.jpg', { type: 'image/jpeg' }) })).error);
  assert.equal(validateMedia(form({ image_file: new File(['image'], 'photo.png', { type: 'image/png' }) })).data.source, 'upload');
});

test('photo posts cannot silently discard their image as a draft', () => {
  assert.ok(validateMedia(form({ mode: 'draft' })).error);
});

test('image links require HTTPS without credentials or nonstandard ports', () => {
  for (const value of ['http://example.com/a.jpg', 'file:///etc/passwd', 'data:image/png;base64,AA', 'https://user:secret@example.com/a.jpg', 'https://example.com:8443/a.jpg', 'not a URL']) {
    assert.throws(() => parseImageUrl(value));
    assert.ok(validateMedia(form({ image_source: 'link', image_url: value })).error);
  }
  assert.equal(validateMedia(form({ image_source: 'link', image_url: ' https://example.com/photo.jpg#fragment ' })).data.url, 'https://example.com/photo.jpg');
});

test('private, mapped, loopback, link-local, multicast, and reserved IPs are blocked', () => {
  for (const address of ['127.0.0.1', '10.0.0.1', '172.16.0.1', '192.168.1.1', '169.254.169.254', '100.64.0.1', '0.0.0.0', '224.0.0.1', '192.0.2.1', '::1', '::', 'fc00::1', 'fe80::1', '::ffff:127.0.0.1', '2001:db8::1', 'invalid']) {
    assert.equal(isPublicAddress(address), false, address);
  }
  assert.equal(isPublicAddress('8.8.8.8'), true);
  assert.equal(isPublicAddress('2606:4700:4700::1111'), true);
});

test('literal internal image hosts are rejected before a connection is made', async () => {
  await assert.rejects(resolveImageHost('127.0.0.1'), /public internet/);
  await assert.rejects(resolveImageHost('[::1]'), /public internet/);
});

test('image processing rejects forged image files and unsafe formats', async () => {
  await assert.rejects(normalizeImage(Buffer.from('<html>not an image</html>')));
  await assert.rejects(normalizeImage(Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="10" height="10"/>')));
  await assert.rejects(normalizeImage(Buffer.alloc(MAX_IMAGE_BYTES + 1)));
});

test('photos become bounded, metadata-free JPEGs with their original aspect ratio', async () => {
  const input = await sharp({ create: { width: 2000, height: 1000, channels: 4, background: '#ff0000' } }).png().withMetadata().toBuffer();
  const result = await normalizeImage(input);
  assert.equal(result.width, 1600);
  assert.equal(result.height, 800);
  const metadata = await sharp(result.bytes).metadata();
  assert.equal(metadata.format, 'jpeg');
  assert.equal(metadata.exif, undefined);
  assert.equal(metadata.icc, undefined);
});

test('AI caption responses must include bounded caption and accessible photo description', () => {
  assert.deepEqual(parsePhotoCaption('{"caption":"  Finals mood  ","alt":"  A crowded library.  "}'), { caption: 'Finals mood', alt: 'A crowded library.' });
  for (const value of ['not JSON', 'null', '{}', '{"caption":"","alt":"photo"}', '{"caption":"test","alt":false}', JSON.stringify({ caption: 'x'.repeat(501), alt: 'photo' })]) {
    assert.throws(() => parsePhotoCaption(value));
  }
});
