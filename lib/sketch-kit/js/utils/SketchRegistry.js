// Shared by the CLI and browser. IDs are file locations; ancestry is metadata.
const own = (object, key) => Object.hasOwn(object, key);

export function prepareRegistry(input) {
    if (!input || !input.sketches || typeof input.sketches !== 'object' || Array.isArray(input.sketches)) {
        throw new Error('Config must contain a sketches object.');
    }
    if (input.schemaVersion !== undefined && ![1, 2].includes(input.schemaVersion)) {
        throw new Error(`Unsupported registry schema: ${input.schemaVersion}`);
    }
    const issues = [];
    const sketches = Object.fromEntries(Object.entries(input.sketches).map(([id, entry]) => {
        if (!entry || typeof entry !== 'object' || Array.isArray(entry)) throw new Error(`Invalid sketch: ${id}`);
        const { children, ...metadata } = entry;
        let parentId = entry.parentId;
        if (parentId === undefined) {
            if (input.schemaVersion === 2) throw new Error(`Missing parentId for ${id}`);
            const suffix = id.match(/^(.*)_([0-9]+)$/);
            const claimants = Object.keys(input.sketches).filter(key => input.sketches[key].children?.includes(id));
            if (suffix && own(input.sketches, suffix[1])) {
                if (suffix[2].length > 1 || claimants.some(key => key !== suffix[1])) {
                    issues.push(`${id}: set parentId explicitly (use null for a root).`);
                    parentId = null;
                } else {
                    parentId = suffix[1];
                }
            } else if (claimants.length) {
                issues.push(`${id}: legacy children disagree with its name; set parentId explicitly.`);
                parentId = null;
            } else {
                parentId = null;
            }
        }
        return [id, { ...metadata, parentId }];
    }));

    const groups = new Map();
    for (const [id, entry] of Object.entries(sketches)) {
        if (entry.parentId !== null && (typeof entry.parentId !== 'string' || !own(sketches, entry.parentId))) {
            throw new Error(`Unknown parent for ${id}: ${entry.parentId}`);
        }
        const visited = new Set([id]);
        let parent = entry.parentId;
        while (parent !== null) {
            if (visited.has(parent)) throw new Error(`Cycle in sketch ancestry at ${id}`);
            visited.add(parent);
            if (!own(sketches, parent)) throw new Error(`Unknown parent: ${parent}`);
            parent = sketches[parent].parentId;
        }
        if (!groups.has(entry.parentId)) groups.set(entry.parentId, []);
        groups.get(entry.parentId).push([id, entry]);
    }

    for (const siblings of groups.values()) {
        const used = new Set();
        for (const [id, entry] of siblings) {
            if (entry.order !== undefined) {
                if (!Number.isSafeInteger(entry.order) || entry.order < 1 || used.has(entry.order)) {
                    throw new Error(`Invalid or duplicate sibling order for ${id}`);
                }
                used.add(entry.order);
            } else if (input.schemaVersion === 2) {
                throw new Error(`Missing order for ${id}`);
            }
        }
        // Preserve numeric gaps in unambiguous legacy names.
        for (const [id, entry] of siblings) {
            if (entry.order !== undefined) continue;
            const suffix = id.match(/_([0-9]+)$/);
            const candidate = entry.parentId !== null && suffix ? Number(suffix[1]) : 0;
            if (candidate > 0 && !used.has(candidate)) {
                entry.order = candidate;
                used.add(candidate);
            }
        }
        let next = 1;
        for (const [, entry] of siblings) {
            if (entry.order !== undefined) continue;
            while (used.has(next)) next++;
            entry.order = next;
            used.add(next++);
        }
    }

    function nextOrder(parentId, saved) {
        if (saved !== undefined && (!Number.isSafeInteger(saved) || saved < 1)) throw new Error('Invalid allocation counter');
        return Math.max(saved ?? 1, ...((groups.get(parentId) ?? []).map(([, entry]) => entry.order + 1)));
    }
    for (const [id, entry] of Object.entries(sketches)) entry.nextOrder = nextOrder(id, entry.nextOrder);
    return {
        config: { ...input, schemaVersion: 2, nextRootOrder: nextOrder(null, input.nextRootOrder), sketches },
        issues,
    };
}

export function validateSketchId(id) {
    const reserved = new Set('await break case catch class const continue debugger default delete do else enum export extends false finally for function if implements import in instanceof interface let new null package private protected public return static super switch this throw true try typeof var void while with yield'.split(' '));
    if (typeof id !== 'string' || !/^[A-Za-z_$][A-Za-z0-9_$]*$/.test(id) || reserved.has(id)) {
        throw new Error(`Invalid sketch ID: ${id}. Use a JavaScript identifier without spaces or path separators.`);
    }
    return id;
}

export function planSketch(config, parentId, requestedId) {
    if (parentId !== null && !own(config.sketches, parentId)) throw new Error(`Unknown sketch: ${parentId}`);
    const order = parentId === null ? config.nextRootOrder : config.sketches[parentId].nextOrder;
    if (requestedId !== undefined) {
        validateSketchId(requestedId);
        if (Object.keys(config.sketches).some(id => id.toLowerCase() === requestedId.toLowerCase())) throw new Error(`Sketch already exists: ${requestedId}`);
        return { id: requestedId, parentId, order, nextOrder: 1 };
    }
    if (parentId === null) throw new Error('A new root sketch needs a name.');
    let number = order;
    while (Object.keys(config.sketches).some(id => id.toLowerCase() === `${parentId}_${number}`.toLowerCase())) number++;
    return { id: validateSketchId(`${parentId}_${number}`), parentId, order: number, nextOrder: 1 };
}

export function registerSketch(config, sketch, author) {
    const { id, ...entry } = sketch;
    if (own(config.sketches, id)) throw new Error(`Sketch already exists: ${id}`);
    const sketches = { ...config.sketches, [id]: { ...entry, author, date: new Date().toISOString() } };
    if (entry.parentId === null) {
        return { ...config, sketches, nextRootOrder: entry.order + 1 };
    }
    sketches[entry.parentId] = { ...sketches[entry.parentId], nextOrder: entry.order + 1 };
    return { ...config, sketches };
}

export function buildSketchTree(sketches) {
    const nodes = new Map(Object.entries(sketches).map(([id, entry]) => [id, { ...entry, name: id, children: [] }]));
    const roots = [];
    for (const node of nodes.values()) {
        if (node.parentId === null) roots.push(node);
        else nodes.get(node.parentId).children.push(node);
    }
    const sort = list => {
        list.sort((a, b) => a.order - b.order);
        for (const node of list) sort(node.children);
        return list;
    };
    return sort(roots);
}

// Compatibility projection for workspaces generated by older Sketch Kit versions.
// parentId remains authoritative; prepareRegistry always discards these arrays.
export function serializeRegistry(config) {
    const sketches = Object.fromEntries(Object.entries(config.sketches)
        .sort(([, a], [, b]) => Number(a.parentId !== null) - Number(b.parentId !== null) || a.order - b.order)
        .map(([id, entry]) => [id, { ...entry, children: [] }]));
    for (const [id, entry] of Object.entries(sketches)) {
        if (entry.parentId !== null) sketches[entry.parentId].children.push(id);
    }
    return { ...config, sketches };
}
