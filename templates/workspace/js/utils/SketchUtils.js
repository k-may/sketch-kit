export const SketchUtils = {
    // Escape every character outside lowercase ASCII/digits, including the escape
    // delimiter itself. This preserves case, underscores and nested sketch IDs.
    sanitizeElementName(name) {
        return 'sk-' + Array.from(name, character =>
            /^[a-z0-9]$/.test(character) ? character : `-${character.codePointAt(0).toString(16)}-`
        ).join('');
    },

    registerElement(name, constructor, registry = customElements) {
        const existing = registry.get(name);
        if (existing && existing !== constructor) {
            throw new Error(`Custom element ${name} is already registered to a different sketch class.`);
        }
        if (!existing) registry.define(name, constructor);
    },
};
