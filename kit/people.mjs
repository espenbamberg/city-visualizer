// A stored scene seed and stable person identity keep cast members recognizable across builds.
export function personProfile(identity, overrides = {}) {
  let seed = 2166136261;
  for (const char of String(identity)) seed = Math.imul(seed ^ char.codePointAt(0),16777619) >>> 0;
  const pick = values => { seed = (Math.imul(seed,1664525)+1013904223) >>> 0; return values[Math.floor(seed/4294967296*values.length)]; };
  return {
    gender:pick(['woman','man','nonbinary']),
    skin:pick(['#e0bda0','#c79b7b','#b58260','#8c6048','#634637']),
    hair:pick(['#3d3631','#655044','#957754','#c2b18b','#8b8980']),
    hairstyle:pick(['short','long','bun','curly','bald']),
    coat:pick(['#577479','#9a795f','#778a70','#9b8b72','#6f798d','#9c797d']),
    trousers:pick(['#424c50','#625e54','#77786a']),
    build:pick([.9,1,1.1]), ...overrides
  };
}
