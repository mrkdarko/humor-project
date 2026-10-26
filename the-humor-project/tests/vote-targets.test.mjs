import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import postcss from 'postcss';

const css = postcss.parse(readFileSync(new URL('../app/globals.css', import.meta.url), 'utf8'));
const movingProperties = /^(transform|translate|scale|rotate|inset|top|right|bottom|left|width|height|padding.*|margin.*|border-width)$/;

test('vote feedback preserves the button hit target', () => {
  let states = 0;
  css.walkRules(rule => {
    if (!rule.selector.includes('.vote-btn-chunky') || (!rule.selector.includes(':') && !rule.selector.includes('['))) return;
    states++;
    rule.walkDecls(declaration => assert.ok(!movingProperties.test(declaration.prop), `${rule.selector} moves the vote target with ${declaration.prop}`));
  });
  assert.ok(states >= 3, 'Hover, active, and selected vote states must be checked');
});

test('caption containers do not animate when a child control is pressed', () => {
  css.walkRules(rule => {
    if (!rule.selector.includes('.chunky-card') || !rule.selector.includes(':active')) return;
    rule.walkDecls(declaration => assert.ok(!movingProperties.test(declaration.prop), `${rule.selector} moves the caption on a child press`));
  });
});
