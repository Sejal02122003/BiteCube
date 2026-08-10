const cp = require('child_process');
const out = cp.execSync('git grep -i tuggo').toString();
const lines = out.split('\n').filter(l => l.trim().length > 0);
const counts = {};
lines.forEach(l => {
    const file = l.split(':')[0];
    counts[file] = (counts[file] || 0) + 1;
});
console.log(JSON.stringify(counts, null, 2));
