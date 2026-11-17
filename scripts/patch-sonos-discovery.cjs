#!/usr/bin/env node
'use strict';

/**
 * Patches sonos-discovery so renamed speakers update without a bridge restart.
 *
 * Upstream caches a Player per UUID and sets roomName once in the constructor.
 * A rename keeps the UUID, so the old name stuck around until the bridge restarted.
 * This makes tryGet() refresh roomName from the latest topology on every cache hit.
 *
 * Usage: node patch-sonos-discovery.cjs <bridge-dir>
 * Safe to run repeatedly. Exits non-zero if upstream changed and the patch no longer applies.
 */

const fs = require('node:fs');
const path = require('node:path');

const bridgeDir = path.resolve(process.argv[2] || '.');
const target = path.join(bridgeDir, 'node_modules', 'sonos-discovery', 'lib', 'SonosSystem.js');
const MARKER = 'sonohaus-patch: refresh roomName';

if (!fs.existsSync(target)) {
  console.error(`patch-sonos-discovery: not found: ${target}`);
  process.exit(1);
}

const src = fs.readFileSync(target, 'utf8');
if (src.includes(MARKER)) {
  console.log('patch-sonos-discovery: already applied');
  process.exit(0);
}

const before = `    if (cache[member.uuid]) {
      return cache[member.uuid];
    }`;
const after = `    if (cache[member.uuid]) {
      // ${MARKER} (renamed speakers keep their UUID)
      if (member.zonename && cache[member.uuid].roomName !== member.zonename) {
        cache[member.uuid].roomName = member.zonename;
      }
      return cache[member.uuid];
    }`;

if (!src.includes(before)) {
  console.error('patch-sonos-discovery: tryGet() not found. sonos-discovery changed upstream; update the patch.');
  process.exit(1);
}

fs.writeFileSync(target, src.replace(before, after));
console.log('patch-sonos-discovery: applied');
