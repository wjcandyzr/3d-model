// Checks run before every deploy (node scripts/check.mjs):
//  1. the page's inline script parses;
//  2. the indoor area still adds up to the 139.5 m² on record;
//  3. the recommended furniture has no clashes (walls, built-ins, door swings, each other);
//  4. built-in cabinets don't run into walls;
//  5. every room can be reached on foot from the front door.
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

const EXPECTED_AREA = 139.5;
const problems = [];

const html = readFileSync(new URL('../src/index.html', import.meta.url), 'utf8');
const inline = html.match(/<script>\r?\n([\s\S]*?)\r?\n<\/script>/);
if (!inline) fail(['src/index.html: inline <script> not found']);
const script = inline[1];
try { new vm.Script(script, { filename: 'src/index.html <script>' }); }
catch (e) { fail([`src/index.html: script does not parse: ${e.message}`]); }

// The model data and geometry helpers sit between these markers and touch no DOM, so they run under Node.
const slice = (from, to) => {
  const i = script.indexOf(from), j = script.indexOf(to, i);
  if (i < 0 || j < 0) fail([`src/index.html: marker not found (${from} … ${to})`]);
  return script.slice(i, j);
};
const model = slice('const G = ', 'ROOMS.forEach(r=>r.area');
const clashFn = slice('function computeClashes', '\n}\n') + '\n}\n';

const probe = `
let clashes = {}, items = DEFAULT_ITEMS.map(x => ({ ...x }));
computeClashes();
const indoorArea = ROOMS.filter(r => !r.outdoor).reduce((s, r) => s + area(r.poly), 0);

const builtinWall = [];
BUILT_RECTS.forEach((r, i) => {
  if (WALL_RECTS.some(w => overlap(r, w, .015))) builtinWall.push(i);
  BUILT_RECTS.forEach((q, j) => { if (j > i && overlap(r, q, .015)) builtinWall.push(i + '/' + j); });
});

// flood-fill a 0.44 m wide walker from outside the entry door
const outside = [{x0:-2.6,x1:-2.4,y0:C1-.8,y1:C1+2.1},{x0:-2.6,x1:0,y0:C1-.8,y1:C1-.6},{x0:-2.6,x1:0,y0:C1+1.9,y1:C1+2.1}];
const rects = [...WALL_RECTS, ...BUILT_RECTS, ...DOOR_LEAVES, ...outside, ...items.filter(blocks).map(foot)];
const free = (x, y) => !rects.some(q => { const qx = Math.max(q.x0, Math.min(x, q.x1)), qy = Math.max(q.y0, Math.min(y, q.y1)); return (x-qx)**2 + (y-qy)**2 < .22*.22; });
const step = .05, key = (x, y) => Math.round(x/step) + ',' + Math.round(y/step);
const start = [-1.5, C1 + .55], seen = new Set([key(...start)]), queue = [start];
while (queue.length) {
  const [x, y] = queue.pop();
  for (const [dx, dy] of [[step,0],[-step,0],[0,step],[0,-step]]) {
    const nx = x + dx, ny = y + dy, k = key(nx, ny);
    if (nx < -2.5 || nx > E + .5 || ny < BY - .5 || ny > N + 2.5 || seen.has(k) || !free(nx, ny)) continue;
    seen.add(k); queue.push([nx, ny]);
  }
}
const reached = new Set();
for (const k of seen) { const [a, b] = k.split(',').map(Number); const r = roomAt(a*step, b*step); if (r) reached.add(r.id); }

({
  indoorArea,
  rooms: ROOMS.map(r => ({ name: r.name, area: area(r.poly), outdoor: !!r.outdoor })),
  clashes: Object.entries(clashes).map(([id, tags]) => ({ name: CATALOG[items.find(i => i.id === id).type].name, id, tags: [...tags] })),
  builtinWall,
  unreached: ROOMS.filter(r => !reached.has(r.id)).map(r => r.name),
});
`;
const out = vm.runInNewContext(model + clashFn + probe, {}, { filename: 'layout-probe' });

console.log('rooms:');
for (const r of out.rooms) console.log(`  ${r.name.padEnd(6, '　')} ${r.area.toFixed(1).padStart(5)} m²${r.outdoor ? '（室外，不计）' : ''}`);
console.log(`indoor total: ${out.indoorArea.toFixed(2)} m²`);

if (Math.abs(out.indoorArea - EXPECTED_AREA) > .05) problems.push(`indoor area is ${out.indoorArea.toFixed(2)} m², expected ${EXPECTED_AREA} m²`);
for (const c of out.clashes) problems.push(`furniture clash: ${c.name} (${c.id}): ${c.tags.join(', ')}`);
if (out.builtinWall.length) problems.push(`built-in cabinets overlap walls or each other: ${out.builtinWall.join(', ')}`);
if (out.unreached.length) problems.push(`cannot walk into: ${out.unreached.join(', ')}`);

problems.length ? fail(problems) : console.log('check: all good');

function fail(list) {
  for (const p of list) console.error('check: ' + p);
  process.exit(1);
}
