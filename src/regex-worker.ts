type RegexRequest = { pattern: string; flags: string; text: string };
self.onmessage = (event: MessageEvent<RegexRequest>) => {
  try {
    const { pattern, flags, text } = event.data;
    const expression = new RegExp(pattern, flags.includes('g') ? flags : `${flags}g`);
    const matches: { start: number; end: number; text: string; groups: (string | undefined)[] }[] = [];
    let match: RegExpExecArray | null;
    while ((match = expression.exec(text)) !== null && matches.length < 500) {
      matches.push({ start: match.index, end: match.index + match[0].length, text: match[0], groups: match.slice(1) });
      if (!flags.includes('g')) break;
      if (match[0].length === 0) expression.lastIndex += flags.includes('u') && (text.codePointAt(expression.lastIndex) || 0) > 65535 ? 2 : 1;
    }
    self.postMessage({ matches, truncated: matches.length === 500 });
  } catch (error) { self.postMessage({ error: error instanceof Error ? error.message : 'Invalid expression.' }); }
};
