import test from 'node:test';
import assert from 'node:assert/strict';
import {pickupMessage,equipmentMessage} from './pickup-feedback.js';

test('coin and upgrade feedback distinguishes the collecting team',()=>{
 assert.equal(pickupMessage({actor:7,target:13},0),'YOUR TEAM · +100 CREDITS');
 assert.equal(pickupMessage({actor:7,target:13},1),'OPPONENT · +100 CREDITS');
 assert.equal(pickupMessage({actor:16,target:17},1),'YOUR TEAM · SPEED UPGRADE');
 assert.equal(pickupMessage({actor:16,target:17},0),'OPPONENT · SPEED UPGRADE');
});

test('equipment feedback uses the current attribute and explains loss on impact',()=>{
 assert.equal(equipmentMessage({gear:17,stats:[170,170,170,250,170,170,170,170]}),'EQUIPMENT: SPEED 250 · LOST WHEN HIT');
 assert.ok(equipmentMessage({gear:0}).includes('GOLD: CREDITS'));
 assert.ok(!equipmentMessage({gear:17}).includes('undefined'));
});
