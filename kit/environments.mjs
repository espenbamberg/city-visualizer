import assert from 'node:assert/strict';

export const environments=['city','campus','building','workspace','technical'];
export function validateEnvironment(value) {
  assert(value===undefined||environments.includes(value),'Unknown landscape environment');
}
