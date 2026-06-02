/* Pure-logic tests for the rule engine — no DB, no sockets. Run: node test/ruleEngine.test.js */
const assert = require('assert');
const { normalizeEvent, _internals } = require('../src/services/ruleEngine');
const { evalCondition, triggerMatches, roleAllowed } = _internals;

let pass = 0, fail = 0;
function t(name, fn) {
    try { fn(); pass++; console.log(`  ✓ ${name}`); }
    catch (e) { fail++; console.log(`  ✗ ${name}\n      ${e.message}`); }
}

console.log('\nnormalizeEvent');
t('maps comment→chat and parses numbers', () => {
    const ev = normalizeEvent({ userId: 'u1', eventType: 'comment', comment: 'hi', count: '3', diamondCount: '5' });
    assert.strictEqual(ev.eventType, 'chat');
    assert.strictEqual(ev.repeatCount, 3);
    assert.strictEqual(ev.coins, 5);
});
t('derives roles from payload', () => {
    const ev = normalizeEvent({ userId: 'u1', eventType: 'gift', isModerator: true, isSubscriber: true });
    assert.ok(ev.roles.has('moderator'));
    assert.ok(ev.roles.has('subscriber'));
    assert.ok(ev.roles.has('everyone'));
});
t('gift id coerced to string', () => {
    const ev = normalizeEvent({ userId: 'u1', eventType: 'gift', giftId: 5655 });
    assert.strictEqual(ev.giftId, '5655');
});

console.log('\nevalCondition');
const giftEv = normalizeEvent({ userId: 'u1', eventType: 'gift', giftName: 'Gül', count: 10, diamondCount: 1 });
t('coins >= passes', () => assert.ok(evalCondition({ field: 'coins', op: '>=', value: '1' }, giftEv)));
t('coins >= fails', () => assert.ok(!evalCondition({ field: 'coins', op: '>=', value: '100' }, giftEv)));
t('giftName == case-insensitive', () => assert.ok(evalCondition({ field: 'giftName', op: '==', value: 'gül' }, giftEv)));
t('repeatCount > passes', () => assert.ok(evalCondition({ field: 'repeatCount', op: '>', value: '5' }, giftEv)));
t('comment includes', () => {
    const c = normalizeEvent({ userId: 'u1', eventType: 'chat', comment: 'hello world' });
    assert.ok(evalCondition({ field: 'comment', op: 'includes', value: 'world' }, c));
});
t('regex matches', () => {
    const c = normalizeEvent({ userId: 'u1', eventType: 'chat', comment: 'order #42' });
    assert.ok(evalCondition({ field: 'comment', op: 'regex', value: '#\\d+' }, c));
});

console.log('\ntriggerMatches');
t('gift trigger any matches any gift', () => {
    const r = { trigger: { type: 'gift', giftId: '', giftName: '' } };
    assert.ok(triggerMatches(r, giftEv).ok);
});
t('gift trigger by name matches', () => {
    const r = { trigger: { type: 'gift', giftName: 'Gül' } };
    assert.ok(triggerMatches(r, giftEv).ok);
});
t('gift trigger by name rejects other', () => {
    const r = { trigger: { type: 'gift', giftName: 'Roket' } };
    assert.ok(!triggerMatches(r, giftEv).ok);
});
t('gift trigger by id matches', () => {
    const ev = normalizeEvent({ userId: 'u1', eventType: 'gift', giftId: 5655 });
    const r = { trigger: { type: 'gift', giftId: '5655' } };
    assert.ok(triggerMatches(r, ev).ok);
});
t('wrong event type rejected', () => {
    const r = { trigger: { type: 'follow' } };
    assert.ok(!triggerMatches(r, giftEv).ok);
});
t('any trigger always matches', () => {
    const r = { trigger: { type: 'any' } };
    assert.ok(triggerMatches(r, giftEv).ok);
});
t('command trigger parses params', () => {
    const ev = normalizeEvent({ userId: 'u1', eventType: 'chat', comment: '!play never gonna give you up' });
    const r = { trigger: { type: 'command', command: 'play', commandPrefix: '!' } };
    const res = triggerMatches(r, ev);
    assert.ok(res.ok);
    assert.strictEqual(res.commandParams, 'never gonna give you up');
});
t('command trigger rejects wrong command', () => {
    const ev = normalizeEvent({ userId: 'u1', eventType: 'chat', comment: '!skip' });
    const r = { trigger: { type: 'command', command: 'play', commandPrefix: '!' } };
    assert.ok(!triggerMatches(r, ev).ok);
});
t('command trigger rejects non-prefixed chat', () => {
    const ev = normalizeEvent({ userId: 'u1', eventType: 'chat', comment: 'play this' });
    const r = { trigger: { type: 'command', command: 'play' } };
    assert.ok(!triggerMatches(r, ev).ok);
});

console.log('\nroleAllowed');
t('everyone allows all', () => {
    assert.ok(roleAllowed({ roles: ['everyone'] }, giftEv));
});
t('subscriber-only rejects plain viewer', () => {
    assert.ok(!roleAllowed({ roles: ['subscriber'] }, giftEv));
});
t('subscriber-only allows subscriber', () => {
    const ev = normalizeEvent({ userId: 'u1', eventType: 'gift', isSubscriber: true });
    assert.ok(roleAllowed({ roles: ['subscriber'] }, ev));
});
t('empty roles defaults to allow', () => {
    assert.ok(roleAllowed({ roles: [] }, giftEv));
});

console.log(`\n${pass} passed, ${fail} failed\n`);
process.exit(fail ? 1 : 0);
