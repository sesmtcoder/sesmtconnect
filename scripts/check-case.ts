import fs from 'fs';
import path from 'path';

const projectRoot = 'c:/sesmtconnect';

function getFiles(dir: string): string[] {
    const files = fs.readdirSync(dir, { withFileTypes: true });
    let results: string[] = [];
    for (const file of files) {
        const res = path.resolve(dir, file.name);
        if (file.isDirectory()) {
            results = results.concat(getFiles(res));
        } else {
            results.push(res);
        }
    }
    return results;
}

const allFiles = getFiles(projectRoot).filter(f => !f.includes('node_modules') && !f.includes('.next') && !f.includes('.git'));
const fileMap = new Map<string, string>(); // lowercase -> actual
allFiles.forEach(f => {
    const rel = path.relative(projectRoot, f).replace(/\\/g, '/');
    fileMap.set(rel.toLowerCase(), rel);
});

console.log(`Found ${allFiles.length} files.`);

let errors = 0;
allFiles.forEach(f => {
    if (!f.endsWith('.ts') && !f.endsWith('.tsx')) return;
    const content = fs.readFileSync(f, 'utf8');
    const importRegex = /from\s+['"](@\/[^'"]+)['"]/g;
    let match;
    while ((match = importRegex.exec(content)) !== null) {
        const importPath = match[1];
        const relImport = importPath.replace('@/', '');
        
        // Try with .ts, .tsx, /index.ts, /index.tsx
        const candidates = [
            relImport + '.ts',
            relImport + '.tsx',
            relImport + '/index.ts',
            relImport + '/index.tsx',
            relImport // maybe it's a directory or already has extension
        ];
        
        let found = false;
        let foundCaseMismatch = false;
        let actualName = '';
        
        for (const cand of candidates) {
            const lowerCand = cand.toLowerCase();
            if (fileMap.has(lowerCand)) {
                found = true;
                actualName = fileMap.get(lowerCand)!;
                if (actualName !== cand) {
                    foundCaseMismatch = true;
                }
                break;
            }
        }
        
        if (foundCaseMismatch) {
            console.error(`CASE MISMATCH in ${path.relative(projectRoot, f)}:`);
            console.error(`  Import: ${importPath}`);
            console.error(`  Actual: @/${actualName.replace(/\.tsx?$/, '')}`);
            errors++;
        }
    }
});

console.log(`Finished with ${errors} errors.`);
if (errors > 0) process.exit(1);
