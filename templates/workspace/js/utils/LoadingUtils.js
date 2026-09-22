const DEFAULT_TIMEOUT = 30000;

function request(url, { timeout = DEFAULT_TIMEOUT, signal } = {}, xml = false) {
    return new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        const cleanup = () => {
            signal?.removeEventListener('abort', abort);
            xhr.onload = xhr.onerror = xhr.onabort = xhr.ontimeout = null;
        };
        const fail = message => { cleanup(); reject(new Error(`${message}: ${url}`)); };
        const abort = () => xhr.abort();
        if (signal?.aborted) { fail('Request aborted'); return; }
        xhr.open('GET', url, true);
        xhr.timeout = timeout;
        xhr.onload = () => {
            if (xhr.status < 200 || xhr.status >= 300) {
                fail(`HTTP ${xhr.status}`);
                return;
            }
            const value = xml ? xhr.responseXML : xhr.responseText;
            cleanup();
            resolve(value);
        };
        xhr.onerror = () => fail('Network error');
        xhr.onabort = () => fail('Request aborted');
        xhr.ontimeout = () => fail('Request timed out');
        signal?.addEventListener('abort', abort, { once: true });
        try { xhr.send(); } catch (error) { cleanup(); reject(error); }
    });
}

export const LoadingUtils = {
    LoadAJAX(url, options) { return request(url, options); },
    LoadSVG(url, options) { return request(url, options, true); },
    LoadJSON(url, options) {
        return request(url, options).then(text => {
            try { return JSON.parse(text); }
            catch (cause) { throw new Error(`Invalid JSON: ${url}`, { cause }); }
        });
    },
    LoadShader(url, options) { return request(url, options); },
    LoadShaders(urls, options) {
        return Promise.all(urls.map(url => LoadingUtils.LoadShader(url, options)));
    },
    LoadImages(urls, options) {
        return Promise.all(urls.map(url => LoadingUtils.LoadImage(url, options)));
    },
    LoadImage(src, { timeout = DEFAULT_TIMEOUT, signal } = {}) {
        return new Promise((resolve, reject) => {
            if (!src) { reject(new Error('Image source is required')); return; }
            const img = new Image();
            let timer;
            const cleanup = () => {
                clearTimeout(timer);
                img.onload = img.onerror = null;
                signal?.removeEventListener('abort', abort);
            };
            const fail = message => { cleanup(); reject(new Error(`${message}: ${src}`)); };
            const abort = () => fail('Image load aborted');
            if (signal?.aborted) { abort(); return; }
            img.onload = () => { cleanup(); resolve(img); };
            img.onerror = () => fail('Image load failed');
            signal?.addEventListener('abort', abort, { once: true });
            if (timeout > 0) timer = setTimeout(() => fail('Image load timed out'), timeout);
            img.src = src;
        });
    },
};
