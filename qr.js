/*
 * Minimal QR Code encoder - byte mode, error correction level M, versions 1-10.
 *
 * This exists so the donate QR code is generated from the same DONATE_URL
 * constant the link uses. Swap the URL in one place and the code follows;
 * there is no committed image to go stale.
 */
(function (global) {
    'use strict';

    // [ecCodewordsPerBlock, [[blockCount, dataCodewordsPerBlock], ...]] for level M.
    const EC_TABLE_M = {
        1: [10, [[1, 16]]],
        2: [16, [[1, 28]]],
        3: [26, [[1, 44]]],
        4: [18, [[2, 32]]],
        5: [24, [[2, 43]]],
        6: [16, [[4, 27]]],
        7: [18, [[4, 31]]],
        8: [22, [[2, 38], [2, 39]]],
        9: [22, [[3, 36], [2, 37]]],
        10: [26, [[4, 43], [1, 44]]]
    };

    const ALIGNMENT_CENTERS = {
        1: [], 2: [6, 18], 3: [6, 22], 4: [6, 26], 5: [6, 30],
        6: [6, 34], 7: [6, 22, 38], 8: [6, 24, 42], 9: [6, 26, 46], 10: [6, 28, 50]
    };

    // GF(256) log/antilog tables, primitive polynomial 0x11d.
    const EXP = new Uint8Array(512);
    const LOG = new Uint8Array(256);
    (function initGaloisTables() {
        let x = 1;
        for (let i = 0; i < 255; i++) {
            EXP[i] = x;
            LOG[x] = i;
            x <<= 1;
            if (x & 0x100) x ^= 0x11d;
        }
        for (let i = 255; i < 512; i++) EXP[i] = EXP[i - 255];
    })();

    function gfMul(a, b) {
        if (a === 0 || b === 0) return 0;
        return EXP[LOG[a] + LOG[b]];
    }

    function rsGeneratorPoly(degree) {
        let poly = [1];
        for (let i = 0; i < degree; i++) {
            const next = new Array(poly.length + 1).fill(0);
            for (let j = 0; j < poly.length; j++) {
                next[j] ^= poly[j];
                next[j + 1] ^= gfMul(poly[j], EXP[i]);
            }
            poly = next;
        }
        return poly;
    }

    function rsRemainder(data, ecCount) {
        const gen = rsGeneratorPoly(ecCount);
        const remainder = new Uint8Array(ecCount);
        for (let i = 0; i < data.length; i++) {
            const factor = data[i] ^ remainder[0];
            remainder.copyWithin(0, 1);
            remainder[ecCount - 1] = 0;
            for (let j = 0; j < ecCount; j++) {
                remainder[j] ^= gfMul(gen[j + 1], factor);
            }
        }
        return remainder;
    }

    function utf8Bytes(text) {
        const encoded = unescape(encodeURIComponent(text));
        const bytes = new Uint8Array(encoded.length);
        for (let i = 0; i < encoded.length; i++) bytes[i] = encoded.charCodeAt(i);
        return bytes;
    }

    function dataCapacity(version) {
        return EC_TABLE_M[version][1].reduce((sum, group) => sum + group[0] * group[1], 0);
    }

    function chooseVersion(byteLength) {
        for (let version = 1; version <= 10; version++) {
            const headerBits = 4 + (version < 10 ? 8 : 16);
            if (headerBits + byteLength * 8 <= dataCapacity(version) * 8) return version;
        }
        throw new Error('QR: content too long for versions 1-10');
    }

    function encodeSegment(bytes, version) {
        const capacity = dataCapacity(version);
        const bits = [];
        const put = (value, length) => {
            for (let i = length - 1; i >= 0; i--) bits.push((value >>> i) & 1);
        };

        put(0b0100, 4);                                  // byte mode indicator
        put(bytes.length, version < 10 ? 8 : 16);        // character count
        for (let i = 0; i < bytes.length; i++) put(bytes[i], 8);

        const capacityBits = capacity * 8;
        put(0, Math.min(4, capacityBits - bits.length)); // terminator
        while (bits.length % 8 !== 0) bits.push(0);

        const codewords = new Uint8Array(capacity);
        const written = bits.length / 8;
        for (let i = 0; i < written; i++) {
            let byte = 0;
            for (let j = 0; j < 8; j++) byte = (byte << 1) | bits[i * 8 + j];
            codewords[i] = byte;
        }
        for (let i = written; i < capacity; i++) {
            codewords[i] = (i - written) % 2 === 0 ? 0xec : 0x11;
        }
        return codewords;
    }

    function interleave(bytes, version) {
        const ecPerBlock = EC_TABLE_M[version][0];
        const groups = EC_TABLE_M[version][1];
        const data = encodeSegment(bytes, version);

        const dataBlocks = [];
        const ecBlocks = [];
        let offset = 0;
        groups.forEach(function (group) {
            for (let i = 0; i < group[0]; i++) {
                const block = data.subarray(offset, offset + group[1]);
                offset += group[1];
                dataBlocks.push(block);
                ecBlocks.push(rsRemainder(block, ecPerBlock));
            }
        });

        const result = [];
        const longestBlock = Math.max.apply(null, dataBlocks.map(function (b) { return b.length; }));
        for (let i = 0; i < longestBlock; i++) {
            dataBlocks.forEach(function (block) {
                if (i < block.length) result.push(block[i]);
            });
        }
        for (let i = 0; i < ecPerBlock; i++) {
            ecBlocks.forEach(function (block) { result.push(block[i]); });
        }
        return result;
    }

    function createGrid(version) {
        const size = version * 4 + 17;
        const modules = [];
        const reserved = [];
        for (let i = 0; i < size; i++) {
            modules.push(new Uint8Array(size));
            reserved.push(new Uint8Array(size));
        }
        return { size: size, modules: modules, reserved: reserved };
    }

    function setFunctionModule(grid, row, col, dark) {
        grid.modules[row][col] = dark ? 1 : 0;
        grid.reserved[row][col] = 1;
    }

    function drawFinder(grid, row, col) {
        for (let r = -1; r <= 7; r++) {
            for (let c = -1; c <= 7; c++) {
                const rr = row + r;
                const cc = col + c;
                if (rr < 0 || rr >= grid.size || cc < 0 || cc >= grid.size) continue;
                const ring = Math.max(Math.abs(r - 3), Math.abs(c - 3));
                setFunctionModule(grid, rr, cc, ring !== 2 && ring <= 3);
            }
        }
    }

    function drawAlignment(grid, row, col) {
        for (let r = -2; r <= 2; r++) {
            for (let c = -2; c <= 2; c++) {
                setFunctionModule(grid, row + r, col + c, Math.max(Math.abs(r), Math.abs(c)) !== 1);
            }
        }
    }

    function computeFormatBits(maskPattern) {
        const data = (0b00 << 3) | maskPattern;   // level M is 0b00
        let rem = data;
        for (let i = 0; i < 10; i++) rem = (rem << 1) ^ ((rem >>> 9) * 0x537);
        return ((data << 10) | rem) ^ 0x5412;
    }

    /**
     * Visits every module that carries format information, as visit(bitIndex, row, col).
     * The 15 bits are written twice: once split around the top-left finder, and once
     * split between the bottom-left and top-right finders.
     */
    function eachFormatModule(size, visit) {
        for (let i = 0; i <= 5; i++) visit(i, i, 8);
        visit(6, 7, 8);
        visit(7, 8, 8);
        visit(8, 8, 7);
        for (let i = 9; i < 15; i++) visit(i, 8, 14 - i);

        for (let i = 0; i < 8; i++) visit(i, 8, size - 1 - i);
        for (let i = 8; i < 15; i++) visit(i, size - 15 + i, 8);
    }

    function computeVersionBits(version) {
        let rem = version;
        for (let i = 0; i < 12; i++) rem = (rem << 1) ^ ((rem >>> 11) * 0x1f25);
        return (version << 12) | rem;
    }

    function drawFunctionPatterns(grid, version) {
        const size = grid.size;

        drawFinder(grid, 0, 0);
        drawFinder(grid, 0, size - 7);
        drawFinder(grid, size - 7, 0);

        for (let i = 8; i < size - 8; i++) {
            setFunctionModule(grid, 6, i, i % 2 === 0);
            setFunctionModule(grid, i, 6, i % 2 === 0);
        }

        const centers = ALIGNMENT_CENTERS[version];
        centers.forEach(function (r) {
            centers.forEach(function (c) {
                const overlapsFinder = (r === 6 && c === 6) ||
                                       (r === 6 && c === size - 7) ||
                                       (r === size - 7 && c === 6);
                if (!overlapsFinder) drawAlignment(grid, r, c);
            });
        });

        // Format information occupies fixed cells; reserve them before data placement.
        eachFormatModule(size, function (bitIndex, row, col) {
            setFunctionModule(grid, row, col, false);
        });
        setFunctionModule(grid, size - 8, 8, true);   // always-dark module

        if (version >= 7) {
            const bits = computeVersionBits(version);
            for (let i = 0; i < 18; i++) {
                const bit = (bits >>> i) & 1;
                const a = size - 11 + (i % 3);
                const b = Math.floor(i / 3);
                setFunctionModule(grid, a, b, bit);
                setFunctionModule(grid, b, a, bit);
            }
        }
    }

    function drawFormatBits(grid, maskPattern) {
        const size = grid.size;
        const bits = computeFormatBits(maskPattern);

        eachFormatModule(size, function (bitIndex, row, col) {
            setFunctionModule(grid, row, col, (bits >>> bitIndex) & 1);
        });
        setFunctionModule(grid, size - 8, 8, true);
    }

    function placeCodewords(grid, codewords) {
        const size = grid.size;
        let bitIndex = 0;
        const totalBits = codewords.length * 8;

        for (let right = size - 1; right >= 1; right -= 2) {
            if (right === 6) right = 5;   // column 6 is the vertical timing pattern
            for (let vert = 0; vert < size; vert++) {
                for (let j = 0; j < 2; j++) {
                    const col = right - j;
                    const upward = ((right + 1) & 2) === 0;
                    const row = upward ? size - 1 - vert : vert;
                    if (!grid.reserved[row][col] && bitIndex < totalBits) {
                        grid.modules[row][col] = (codewords[bitIndex >>> 3] >>> (7 - (bitIndex & 7))) & 1;
                        bitIndex++;
                    }
                }
            }
        }
    }

    const MASK_FUNCTIONS = [
        function (i, j) { return (i + j) % 2 === 0; },
        function (i) { return i % 2 === 0; },
        function (i, j) { return j % 3 === 0; },
        function (i, j) { return (i + j) % 3 === 0; },
        function (i, j) { return (Math.floor(i / 2) + Math.floor(j / 3)) % 2 === 0; },
        function (i, j) { return ((i * j) % 2) + ((i * j) % 3) === 0; },
        function (i, j) { return (((i * j) % 2) + ((i * j) % 3)) % 2 === 0; },
        function (i, j) { return (((i + j) % 2) + ((i * j) % 3)) % 2 === 0; }
    ];

    function applyMask(grid, maskPattern) {
        const mask = MASK_FUNCTIONS[maskPattern];
        for (let row = 0; row < grid.size; row++) {
            for (let col = 0; col < grid.size; col++) {
                if (!grid.reserved[row][col] && mask(row, col)) {
                    grid.modules[row][col] ^= 1;
                }
            }
        }
    }

    const FINDER_LIKE = [1, 0, 1, 1, 1, 0, 1, 0, 0, 0, 0];

    function computePenalty(grid) {
        const size = grid.size;
        const modules = grid.modules;
        let penalty = 0;

        // Rule 1: runs of five or more same-coloured modules.
        for (let i = 0; i < size; i++) {
            let rowRun = 1;
            let colRun = 1;
            for (let j = 1; j < size; j++) {
                if (modules[i][j] === modules[i][j - 1]) {
                    rowRun++;
                } else {
                    if (rowRun >= 5) penalty += rowRun - 2;
                    rowRun = 1;
                }
                if (modules[j][i] === modules[j - 1][i]) {
                    colRun++;
                } else {
                    if (colRun >= 5) penalty += colRun - 2;
                    colRun = 1;
                }
            }
            if (rowRun >= 5) penalty += rowRun - 2;
            if (colRun >= 5) penalty += colRun - 2;
        }

        // Rule 2: 2x2 blocks of a single colour.
        for (let i = 0; i < size - 1; i++) {
            for (let j = 0; j < size - 1; j++) {
                const v = modules[i][j];
                if (v === modules[i][j + 1] && v === modules[i + 1][j] && v === modules[i + 1][j + 1]) {
                    penalty += 3;
                }
            }
        }

        // Rule 3: finder-like 1:1:3:1:1 sequences.
        for (let i = 0; i < size; i++) {
            for (let j = 0; j + 11 <= size; j++) {
                let rowFwd = true;
                let rowRev = true;
                let colFwd = true;
                let colRev = true;
                for (let k = 0; k < 11; k++) {
                    if (modules[i][j + k] !== FINDER_LIKE[k]) rowFwd = false;
                    if (modules[i][j + k] !== FINDER_LIKE[10 - k]) rowRev = false;
                    if (modules[j + k][i] !== FINDER_LIKE[k]) colFwd = false;
                    if (modules[j + k][i] !== FINDER_LIKE[10 - k]) colRev = false;
                }
                if (rowFwd) penalty += 40;
                if (rowRev) penalty += 40;
                if (colFwd) penalty += 40;
                if (colRev) penalty += 40;
            }
        }

        // Rule 4: deviation of the dark-module ratio from 50%.
        let dark = 0;
        for (let i = 0; i < size; i++) {
            for (let j = 0; j < size; j++) dark += modules[i][j];
        }
        const total = size * size;
        penalty += Math.floor(Math.abs(dark * 20 - total * 10) / total) * 10;

        return penalty;
    }

    /**
     * Builds the module matrix for `text`.
     * Returns { size, modules } where modules[row][col] is 1 for dark.
     * `forcedMask` is for testing; production callers omit it and get the
     * lowest-penalty mask.
     */
    function encode(text, forcedMask) {
        const bytes = utf8Bytes(text);
        const version = chooseVersion(bytes.length);
        const codewords = interleave(bytes, version);

        let best = null;
        let bestPenalty = Infinity;
        const masks = forcedMask === undefined ? [0, 1, 2, 3, 4, 5, 6, 7] : [forcedMask];

        masks.forEach(function (maskPattern) {
            const grid = createGrid(version);
            drawFunctionPatterns(grid, version);
            placeCodewords(grid, codewords);
            drawFormatBits(grid, maskPattern);
            applyMask(grid, maskPattern);

            const penalty = computePenalty(grid);
            if (penalty < bestPenalty) {
                bestPenalty = penalty;
                best = { size: grid.size, modules: grid.modules, version: version, mask: maskPattern };
            }
        });

        return best;
    }

    /**
     * Renders `text` as an SVG string. `quietZone` is in modules (spec minimum 4).
     */
    function toSvg(text, options) {
        const opts = options || {};
        const quietZone = opts.quietZone === undefined ? 4 : opts.quietZone;
        const dark = opts.dark || '#000000';
        const light = opts.light || '#ffffff';
        const result = encode(text);
        const extent = result.size + quietZone * 2;

        // One path of 1x1 rects keeps the markup small and avoids seams between modules.
        let path = '';
        for (let row = 0; row < result.size; row++) {
            for (let col = 0; col < result.size; col++) {
                if (result.modules[row][col]) {
                    path += 'M' + (col + quietZone) + ' ' + (row + quietZone) + 'h1v1h-1z';
                }
            }
        }

        return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ' + extent + ' ' + extent + '" ' +
               'shape-rendering="crispEdges" role="img" aria-hidden="true">' +
               '<rect width="' + extent + '" height="' + extent + '" fill="' + light + '"/>' +
               '<path d="' + path + '" fill="' + dark + '"/>' +
               '</svg>';
    }

    const QR = { encode: encode, toSvg: toSvg };

    if (typeof module !== 'undefined' && module.exports) {
        module.exports = QR;
    } else {
        global.QR = QR;
    }
})(typeof globalThis !== 'undefined' ? globalThis : this);
