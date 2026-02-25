import type { GraphNode, GraphEdge } from '@shared/types';

export interface ParsedFile {
  path: string;
  language: string;
  nodes: GraphNode[];
  edges: GraphEdge[];
  imports: string[];
  exports: string[];
  functions: Array<{
    name: string;
    line: number;
    params: string[];
  }>;
  classes: Array<{
    name: string;
    line: number;
    methods: string[];
  }>;
}

export class CodeParser {
  private static instance: CodeParser;

  static getInstance(): CodeParser {
    if (!CodeParser.instance) {
      CodeParser.instance = new CodeParser();
    }
    return CodeParser.instance;
  }

  async parseFile(path: string, content: string): Promise<ParsedFile | null> {
    const language = this.detectLanguage(path);
    if (!language) return null;

    const nodes: GraphNode[] = [];
    const edges: GraphEdge[] = [];
    const fileId = `file:${path}`;

    // Create file node
    nodes.push({
      id: fileId,
      type: 'file',
      label: path.split('/').pop() || path,
      path,
      language,
      metrics: {
        linesOfCode: content.split('\n').length,
        complexity: this.calculateComplexity(content),
      },
    });

    // Parse based on language
    const { imports, exports, functions, classes } = this.parseContent(content, language);

    // Create nodes for functions
    functions.forEach((fn, index) => {
      const fnId = `func:${path}:${fn.name}:${index}`;
      nodes.push({
        id: fnId,
        type: 'function',
        label: fn.name,
        path: `${path}:${fn.line}`,
        language,
        data: { params: fn.params },
      });

      edges.push({
        id: `edge:${fileId}:${fnId}`,
        source: fileId,
        target: fnId,
        type: 'contains',
      });
    });

    // Create nodes for classes
    classes.forEach((cls, index) => {
      const clsId = `class:${path}:${cls.name}:${index}`;
      nodes.push({
        id: clsId,
        type: 'class',
        label: cls.name,
        path: `${path}:${cls.line}`,
        language,
        data: { methods: cls.methods },
      });

      edges.push({
        id: `edge:${fileId}:${clsId}`,
        source: fileId,
        target: clsId,
        type: 'contains',
      });
    });

    // Create import edges
    imports.forEach((imp, index) => {
      const impId = `import:${path}:${index}`;
      nodes.push({
        id: impId,
        type: 'import',
        label: imp,
        path: imp,
        language,
      });

      edges.push({
        id: `edge:${fileId}:${impId}`,
        source: fileId,
        target: impId,
        type: 'imports',
      });
    });

    return {
      path,
      language,
      nodes,
      edges,
      imports,
      exports,
      functions,
      classes,
    };
  }

  private detectLanguage(path: string): string | null {
    const ext = path.split('.').pop()?.toLowerCase();
    const langMap: Record<string, string> = {
      js: 'javascript',
      jsx: 'javascript',
      ts: 'typescript',
      tsx: 'typescript',
      py: 'python',
      go: 'go',
      rs: 'rust',
      java: 'java',
      cs: 'csharp',
      cpp: 'cpp',
      c: 'c',
      h: 'c',
      rb: 'ruby',
      php: 'php',
      swift: 'swift',
      kt: 'kotlin',
    };
    return langMap[ext || ''] || null;
  }

  private parseContent(content: string, language: string) {
    const imports: string[] = [];
    const exports: string[] = [];
    const functions: Array<{ name: string; line: number; params: string[] }> = [];
    const classes: Array<{ name: string; line: number; methods: string[] }> = [];

    const lines = content.split('\n');

    switch (language) {
      case 'javascript':
      case 'typescript':
        this.parseJavaScript(content, lines, imports, exports, functions, classes);
        break;
      case 'python':
        this.parsePython(content, lines, imports, exports, functions, classes);
        break;
      default:
        // Basic parsing for other languages
        this.parseGeneric(content, lines, imports, exports, functions, classes);
    }

    return { imports, exports, functions, classes };
  }

  private parseJavaScript(
    content: string,
    _lines: string[],
    imports: string[],
    _exports: string[],
    functions: Array<{ name: string; line: number; params: string[] }>,
    classes: Array<{ name: string; line: number; methods: string[] }>
  ) {
    // Import patterns
    const importRegex = /import\s+(?:(?:\{[^}]*\}|[^'"]*)\s+from\s+)?['"]([^'"]+)['"]/g;
    let match;
    while ((match = importRegex.exec(content)) !== null) {
      imports.push(match[1]);
    }

    // Export patterns
    const exportRegex = /export\s+(?:default\s+)?(?:class|function|const|let|var)?\s*(\w+)/g;
    while ((match = exportRegex.exec(content)) !== null) {
      _exports.push(match[1]);
    }

    // Function patterns
    const funcRegex = /(?:export\s+)?(?:async\s+)?function\s+(\w+)\s*\(([^)]*)\)/g;
    while ((match = funcRegex.exec(content)) !== null) {
      const lineIndex = content.substring(0, match.index).split('\n').length;
      functions.push({
        name: match[1],
        line: lineIndex,
        params: match[2].split(',').map(p => p.trim()).filter(Boolean),
      });
    }

    // Arrow functions
    const arrowRegex = /(?:export\s+)?(?:const|let|var)\s+(\w+)\s*=\s*(?:async\s*)?\(([^)]*)\)\s*=>/g;
    while ((match = arrowRegex.exec(content)) !== null) {
      const lineIndex = content.substring(0, match.index).split('\n').length;
      functions.push({
        name: match[1],
        line: lineIndex,
        params: match[2].split(',').map(p => p.trim()).filter(Boolean),
      });
    }

    // Class patterns
    const classRegex = /class\s+(\w+)(?:\s+extends\s+(\w+))?\s*\{/g;
    while ((match = classRegex.exec(content)) !== null) {
      const lineIndex = content.substring(0, match.index).split('\n').length;
      const classStart = match.index;
      const classContent = this.extractClassContent(content, classStart);
      const methods = this.extractMethods(classContent);
      
      classes.push({
        name: match[1],
        line: lineIndex,
        methods,
      });
    }
  }

  private parsePython(
    content: string,
    _lines: string[],
    imports: string[],
    _exports: string[],
    functions: Array<{ name: string; line: number; params: string[] }>,
    classes: Array<{ name: string; line: number; methods: string[] }>
  ) {
    // Import patterns
    const importRegex = /^(?:from\s+(\S+)\s+)?import\s+(.+)$/gm;
    let match;
    while ((match = importRegex.exec(content)) !== null) {
      if (match[1]) {
        imports.push(match[1]);
      }
      match[2].split(',').forEach(imp => {
        imports.push(imp.trim());
      });
    }

    // Function patterns
    const funcRegex = /^def\s+(\w+)\s*\(([^)]*)\)/gm;
    while ((match = funcRegex.exec(content)) !== null) {
      const lineIndex = content.substring(0, match.index).split('\n').length;
      functions.push({
        name: match[1],
        line: lineIndex,
        params: match[2].split(',').map(p => p.trim().split('=')[0].split(':')[0].trim()).filter(Boolean),
      });
    }

    // Class patterns
    const classRegex = /^class\s+(\w+)(?:\(([^)]*)\))?:/gm;
    while ((match = classRegex.exec(content)) !== null) {
      const lineIndex = content.substring(0, match.index).split('\n').length;
      const classStart = match.index;
      const classContent = this.extractClassContent(content, classStart);
      const methods = this.extractMethods(classContent);
      
      classes.push({
        name: match[1],
        line: lineIndex,
        methods,
      });
    }
  }

  private parseGeneric(
    content: string,
    _lines: string[],
    _imports: string[],
    _exports: string[],
    functions: Array<{ name: string; line: number; params: string[] }>,
    classes: Array<{ name: string; line: number; methods: string[] }>
  ) {
    // Generic function detection
    const funcRegex = /(?:function|def|fn|func)\s+(\w+)\s*\(([^)]*)\)/g;
    let match;
    while ((match = funcRegex.exec(content)) !== null) {
      const lineIndex = content.substring(0, match.index).split('\n').length;
      functions.push({
        name: match[1],
        line: lineIndex,
        params: match[2].split(',').map(p => p.trim()).filter(Boolean),
      });
    }

    // Generic class detection
    const classRegex = /(?:class|struct|interface)\s+(\w+)/g;
    while ((match = classRegex.exec(content)) !== null) {
      const lineIndex = content.substring(0, match.index).split('\n').length;
      classes.push({
        name: match[1],
        line: lineIndex,
        methods: [],
      });
    }
  }

  private extractClassContent(content: string, startIndex: number): string {
    let braceCount = 0;
    let started = false;
    let endIndex = startIndex;

    for (let i = startIndex; i < content.length; i++) {
      if (content[i] === '{') {
        braceCount++;
        started = true;
      } else if (content[i] === '}') {
        braceCount--;
        if (started && braceCount === 0) {
          endIndex = i;
          break;
        }
      }
    }

    return content.substring(startIndex, endIndex + 1);
  }

  private extractMethods(classContent: string): string[] {
    const methods: string[] = [];
    const methodRegex = /(?:async\s+)?(\w+)\s*\([^)]*\)\s*\{/g;
    let match;
    while ((match = methodRegex.exec(classContent)) !== null) {
      if (!['if', 'for', 'while', 'switch', 'catch'].includes(match[1])) {
        methods.push(match[1]);
      }
    }
    return methods;
  }

  private calculateComplexity(content: string): number {
    const complexityPatterns = [
      /\bif\b/g,
      /\belse\s+if\b/g,
      /\bwhile\b/g,
      /\bfor\b/g,
      /\bcase\b/g,
      /\bcatch\b/g,
      /\?\s*[^:]+\s*:/g,
      /\|\||&&/g,
    ];

    let complexity = 1;
    complexityPatterns.forEach(pattern => {
      const matches = content.match(pattern);
      if (matches) {
        complexity += matches.length;
      }
    });

    return complexity;
  }
}
