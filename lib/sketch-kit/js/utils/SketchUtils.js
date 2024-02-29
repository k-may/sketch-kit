export const SketchUtils = {

    /**
     * Sanitize the name of a custom element (see : https://html.spec.whatwg.org/multipage/custom-elements.html#prod-potentialcustomelementname )
     * @param name
     * @returns {string}
     */
    sanitizeElementName : name => {

        name = "sk-" + name.toLowerCase()
        // Remove characters that are not allowed in custom element names
        const sanitizedString = name.replace(/[^a-z0-9-]/g, '');

        // Ensure that the name starts with a lowercase letter and contains at least one dash
        const customElementName = sanitizedString.replace(/^[^a-z]+/, '').replace(/^-+/, '');

        return customElementName;
    }
}