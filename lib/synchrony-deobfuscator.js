const fs = require('fs');
const path = require('path');

let deobfuscatorInstance = null;

function initializeDeobfuscator() {
    if (deobfuscatorInstance) {
        return deobfuscatorInstance;
    }

    const synchronyScript = fs.readFileSync(
        path.join(__dirname, '../synchrony-v2.4.5.1.js'),
        'utf8'
    );

    const exportRegex = /export\{(.*) as Deobfuscator,(.*) as Transformer\}/;
    const match = synchronyScript.match(exportRegex);
    
    if (!match) {
        throw new Error('Could not find Deobfuscator export in synchrony script');
    }

    const modifiedScript = synchronyScript.replace(
        match[0],
        `const Deobfuscator = ${match[1]}, Transformer = ${match[2]};`
    );

    const context = {
        console: {
            log: () => {},
            warn: () => {},
            error: () => {},
            trace: () => {}
        }
    };

    const contextVars = Object.keys(context).map(key => key).join(', ');
    const contextValues = Object.keys(context).map(key => context[key]);

    const wrappedScript = `
        (function(${contextVars}) {
            ${modifiedScript}
            return { Deobfuscator, Transformer };
        })
    `;

    const factory = eval(wrappedScript);
    const { Deobfuscator } = factory(...contextValues);
    
    deobfuscatorInstance = new Deobfuscator();
    return deobfuscatorInstance;
}

function deobfuscate(source) {
    try {
        const deobfuscator = initializeDeobfuscator();
        const result = deobfuscator.deobfuscateSource(source);
        return result || source;
    } catch (error) {
        console.log('Deobfuscation failed:', error.message);
        return source;
    }
}

module.exports = { deobfuscate };
