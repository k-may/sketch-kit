export let TemplateUtils = {
    AddTemplate: (el, templateId, cloneDeep) => {
        return new Promise(resolve => {
            cloneDeep = cloneDeep != undefined ? cloneDeep : true;
            var template = document.querySelector(templateId);

            var clone = document.importNode(template.content, cloneDeep);
            var className = '.' + template.content.children[0].className;
            el.appendChild(clone);
            setTimeout(() => {
                resolve(el.querySelector(className));
            }, 1);
        });
    },

    Import: htmlPath => {
        return new Promise((resolve, reject) => {
            var link = document.createElement('link');
            link.rel = 'import';
            link.href = htmlPath;
            link.setAttribute('async', ''); // make it async!
            link.onload = e => {
                resolve(document.querySelector('link[rel="import"]').import);
            };
            link.onerror = e => {
                reject(e);
            };
            document.head.appendChild(link);
        });
    },
};
