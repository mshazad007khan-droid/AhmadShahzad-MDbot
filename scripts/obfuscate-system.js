// Usage: node scripts/obfuscate-system.js
// _source_unobfuscated/system.src.js  ->  lib/system.js (obfuscated)
// Agar `javascript-obfuscator` installed hai to wo (strong) use hota hai, warna built-in packer.
const fs = require('fs'), path = require('path'), zlib = require('zlib'), crypto = require('crypto');
const src = fs.readFileSync(path.join(__dirname, '..', '_source_unobfuscated', 'system.src.js'), 'utf8');
const out = path.join(__dirname, '..', 'lib', 'system.js');
let code;
try {
    const JO = require('javascript-obfuscator');
    code = JO.obfuscate(src, { compact: true, controlFlowFlattening: true, controlFlowFlatteningThreshold: 0.75, deadCodeInjection: true, deadCodeInjectionThreshold: 0.3,
        stringArray: true, stringArrayEncoding: ['rc4'], stringArrayThreshold: 1, splitStrings: true, splitStringsChunkLength: 6, identifierNamesGenerator: 'hexadecimal',
        selfDefending: false, target: 'node' }).getObfuscatedCode();
    console.log('javascript-obfuscator se obfuscate hua');
} catch (_) {
    const key = crypto.randomBytes(24);
    const packed = zlib.deflateRawSync(Buffer.from(src, 'utf8'));
    const enc = Buffer.alloc(packed.length);
    for (let i = 0; i < packed.length; i++) enc[i] = packed[i] ^ key[i % key.length] ^ ((i * 31 + 7) & 255);
    const b = (x) => x.toString('base64');
    code = `'use strict';var _0xZ=require('zlib'),_0xk='${b(key)}',_0xd='${b(enc)}';` +
        `(function(z,k,d){var K=Buffer.from(k,'base64'),D=Buffer.from(d,'base64'),B=Buffer.alloc(D.length),i;` +
        `for(i=0;i<D.length;i++)B[i]=D[i]^K[i%K.length]^((i*31+7)&255);` +
        `var S=z.inflateRawSync(B).toString('utf8');new Function('require','module','exports',S)(require,module,exports);})(_0xZ,_0xk,_0xd);`;
    code = code.replace(/\(_0x\)\s*;?$/, '');
    console.log('built-in packer se obfuscate hua (strong obfuscation ke liye: npm i javascript-obfuscator)');
}
fs.writeFileSync(out, code);
