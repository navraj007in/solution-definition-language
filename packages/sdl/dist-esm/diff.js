/**
 * Compares two normalized SDL documents and returns a structured diff.
 * Both documents should be compiled/normalized first.
 */
export function diff(a, b) {
    const changes = [];
    deepDiff(a, b, '', changes);
    const summary = buildSummary(changes);
    return {
        identical: changes.length === 0,
        changes,
        summary,
    };
}
// ─── Deep diff engine ───
function deepDiff(a, b, path, changes) {
    // Same reference or both null/undefined
    if (a === b)
        return;
    // One is null/undefined
    if (a == null && b != null) {
        changes.push({ path: path || '(root)', type: 'added', newValue: b });
        return;
    }
    if (a != null && b == null) {
        changes.push({ path: path || '(root)', type: 'removed', oldValue: a });
        return;
    }
    // Different types
    if (typeof a !== typeof b) {
        changes.push({ path: path || '(root)', type: 'changed', oldValue: a, newValue: b });
        return;
    }
    // Arrays
    if (Array.isArray(a) && Array.isArray(b)) {
        diffArrays(a, b, path, changes);
        return;
    }
    // Objects
    if (typeof a === 'object' && typeof b === 'object' && a !== null && b !== null && !Array.isArray(a)) {
        diffObjects(a, b, path, changes);
        return;
    }
    // Primitives
    if (a !== b) {
        changes.push({ path: path || '(root)', type: 'changed', oldValue: a, newValue: b });
    }
}
function diffObjects(a, b, path, changes) {
    const allKeys = new Set([...Object.keys(a), ...Object.keys(b)]);
    for (const key of allKeys) {
        const childPath = path ? `${path}.${key}` : key;
        const inA = key in a;
        const inB = key in b;
        if (inA && !inB) {
            changes.push({ path: childPath, type: 'removed', oldValue: a[key] });
        }
        else if (!inA && inB) {
            changes.push({ path: childPath, type: 'added', newValue: b[key] });
        }
        else {
            deepDiff(a[key], b[key], childPath, changes);
        }
    }
}
function diffArrays(a, b, path, changes) {
    // Try name-based matching for named objects (projects, personas, services, etc.)
    if (a.length > 0 && b.length > 0 && isNamedArray(a) && isNamedArray(b)) {
        diffNamedArrays(a, b, path, changes);
        return;
    }
    // Index-based comparison for primitives / unnamed objects
    const maxLen = Math.max(a.length, b.length);
    for (let i = 0; i < maxLen; i++) {
        const childPath = `${path}[${i}]`;
        if (i >= a.length) {
            changes.push({ path: childPath, type: 'added', newValue: b[i] });
        }
        else if (i >= b.length) {
            changes.push({ path: childPath, type: 'removed', oldValue: a[i] });
        }
        else {
            deepDiff(a[i], b[i], childPath, changes);
        }
    }
}
function isNamedArray(arr) {
    return arr.every((item) => typeof item === 'object' && item !== null && 'name' in item && typeof item.name === 'string');
}
function diffNamedArrays(a, b, path, changes) {
    const aMap = new Map(a.map((item) => [item.name, item]));
    const bMap = new Map(b.map((item) => [item.name, item]));
    // Items removed
    for (const [name, item] of aMap) {
        if (!bMap.has(name)) {
            changes.push({ path: `${path}[name=${name}]`, type: 'removed', oldValue: item });
        }
    }
    // Items added
    for (const [name, item] of bMap) {
        if (!aMap.has(name)) {
            changes.push({ path: `${path}[name=${name}]`, type: 'added', newValue: item });
        }
    }
    // Items present in both — deep diff
    for (const [name, aItem] of aMap) {
        const bItem = bMap.get(name);
        if (bItem) {
            deepDiff(aItem, bItem, `${path}[name=${name}]`, changes);
        }
    }
}
// ─── Summary builder ───
function buildSummary(changes) {
    if (changes.length === 0)
        return ['No changes detected.'];
    const summary = [];
    // Group by top-level section
    const sections = new Map();
    for (const change of changes) {
        const section = change.path.split('.')[0].split('[')[0];
        if (!sections.has(section))
            sections.set(section, []);
        sections.get(section).push(change);
    }
    for (const [section, sectionChanges] of sections) {
        const added = sectionChanges.filter((c) => c.type === 'added').length;
        const removed = sectionChanges.filter((c) => c.type === 'removed').length;
        const changed = sectionChanges.filter((c) => c.type === 'changed').length;
        const parts = [];
        if (added > 0)
            parts.push(`${added} added`);
        if (removed > 0)
            parts.push(`${removed} removed`);
        if (changed > 0)
            parts.push(`${changed} changed`);
        summary.push(`${section}: ${parts.join(', ')}`);
    }
    summary.push(`Total: ${changes.length} change${changes.length === 1 ? '' : 's'}`);
    return summary;
}
