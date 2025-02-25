import { Project, TypeReferenceNode, ts } from 'ts-morph';
import * as fs from 'fs';
import path from 'path';

// Set up a queue for processing types iteratively
const typeQueue: Set<string> = new Set();
const visitedTypes: Set<string> = new Set();

// Function to asynchronously write data to a file in chunks to avoid memory overflow
async function writeToFile(filePath: string, content: string) {
  return new Promise<void>((resolve, reject) => {
    fs.appendFile(filePath, content, 'utf-8', (err) => {
      if (err) reject(err);
      resolve();
    });
  });
}

// Process types in batches to avoid too much recursion
async function processTypesInBatch(project: Project, batchSize: number) {
  let count = 0;
  const outputFile = './isolatedTypes.ts';

  // Start with a clean slate for the output file
  fs.writeFileSync(outputFile, '/* Type definitions extracted from the original file */\n\n', 'utf-8');
  
  while (typeQueue.size > 0) {
    const batch = Array.from(typeQueue).splice(0, batchSize);
    const typeDefinitions: string[] = [];

    // Process each type in the batch
    for (const typeName of batch) {
      if (!visitedTypes.has(typeName)) {
        visitedTypes.add(typeName);

        const typeDefinition = getTypeDefinition(typeName, project);
        if (typeDefinition) {
          typeDefinitions.push(typeDefinition);
          // Collect dependencies of the current type
          const referencedTypes = collectDependencies(typeName, project);
          referencedTypes.forEach((t) => typeQueue.add(t));
        }
      }

      count++;
      if (count % 100 === 0) {
        console.log(`Processed ${count} types...`);
      }
    }

    // Write the batch to disk asynchronously
    await writeToFile(outputFile, typeDefinitions.join('\n\n'));
  }

  console.log('Finished writing all types to disk');
}

// Function to collect dependencies for a specific type
function collectDependencies(typeName: string, project: Project): string[] {
  const sourceFile = project.getSourceFileOrThrow('node_modules/@ai-sdk/ui-utils/dist/index.d.ts');
  const usedTypes: string[] = [];

  const typeAlias = sourceFile.getTypeAlias(typeName);
  const interfaceDecl = sourceFile.getInterface(typeName);
  if (typeAlias) {
    const referencedTypes = typeAlias.getDescendantsOfKind(ts.SyntaxKind.TypeReference);
    referencedTypes.forEach((typeRef: TypeReferenceNode) => {
      usedTypes.push(typeRef.getText());
    });
  }
  
  if (interfaceDecl) {
    const referencedTypes = interfaceDecl.getDescendantsOfKind(ts.SyntaxKind.TypeReference);
    referencedTypes.forEach((typeRef: TypeReferenceNode) => {
      usedTypes.push(typeRef.getText());
    });
  }

  return usedTypes;
}

// Function to get the type definition for a specific type name
function getTypeDefinition(typeName: string, project: Project): string | undefined {
  const sourceFile = project.getSourceFileOrThrow('node_modules/@ai-sdk/ui-utils/dist/index.d.ts');
  const typeAlias = sourceFile.getTypeAlias(typeName);
  const interfaceDecl = sourceFile.getInterface(typeName);

  if (typeAlias) {
    return typeAlias.getText();
  }

  if (interfaceDecl) {
    return interfaceDecl.getText();
  }

  return undefined;
}

// Main function to initialize the type collection and start the process
async function extractTypes() {
  const project = new Project({
    tsConfigFilePath: 'tsconfig.json',
  });

  // Start with the types you know from imports
  const initialTypes = ['ChatRequestOptions', 'Message'];
  initialTypes.forEach((typeName) => typeQueue.add(typeName));

  // Perform the batch processing with a batch size of 10
  await processTypesInBatch(project, 10);
}

extractTypes().catch((err) => {
  console.error('Error extracting types:', err);
});
