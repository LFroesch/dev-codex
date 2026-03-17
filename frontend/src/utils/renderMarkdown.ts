/** Shared markdown-to-HTML renderer. Sanitizes dangerous HTML from input first. */
export function renderMarkdown(text: string, isPreview = false): string {
  if (!text) return '<p class="text-base-content/60 italic">No content...</p>';

  // Strip dangerous HTML from input before processing
  let processedText = text
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<iframe[\s\S]*?(?:<\/iframe>|\/?>)/gi, '')
    .replace(/<object[\s\S]*?(?:<\/object>|\/?>)/gi, '')
    .replace(/<embed[^>]*\/?>/gi, '')
    // Strip ALL event handlers: quoted, unquoted, and expression-based
    .replace(/\s+on\w+\s*=\s*"[^"]*"/gi, '')
    .replace(/\s+on\w+\s*=\s*'[^']*'/gi, '')
    .replace(/\s+on\w+\s*=\s*[^\s>]*/gi, '')
    .replace(/javascript\s*:/gi, '')
    .replace(/data\s*:/gi, 'data-blocked:');

  const ensureProtocol = (url: string): string =>
    url.startsWith('http://') || url.startsWith('https://') ? url : 'https://' + url;

  // 1. Headers
  processedText = processedText
    .replace(/^### (.*$)/gm, '<h3 class="text-lg font-semibold mt-4 mb-2">$1</h3>')
    .replace(/^## (.*$)/gm, '<h2 class="text-xl font-semibold mt-4 mb-2">$1</h2>')
    .replace(/^# (.*$)/gm, '<h1 class="text-2xl font-bold mt-4 mb-2">$1</h1>');

  // 2. Code blocks (before inline code and links)
  processedText = processedText
    .replace(/```([\s\S]*?)```/gim, '<pre class="bg-base-200 rounded p-3 my-2 overflow-x-auto"><code class="text-sm font-mono">$1</code></pre>')
    .replace(/`([^`]+)`/gim, '<code class="bg-base-200 px-2 py-1 rounded text-sm font-mono">$1</code>');

  // 3. Markdown links [text](url)
  processedText = processedText.replace(/\[([^\]]+)\]\(([^)]+)\)/gim, (_, linkText, url) => {
    const fullUrl = ensureProtocol(url);
    return `<a href="${fullUrl}" class="link link-primary" target="_blank" rel="noopener noreferrer">${linkText}</a>`;
  });

  // 4. Auto-detect plain URLs
  processedText = processedText.replace(
    /(?<!<[^>]*|`[^`]*|\[[^\]]*\]\()[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*\.[a-zA-Z]{2,}(?:\/[^\s<]*)?/gi,
    (match) => `<a href="${ensureProtocol(match)}" class="link link-primary" target="_blank" rel="noopener noreferrer">${match}</a>`
  );

  // 5. Auto-detect http/https URLs
  processedText = processedText.replace(
    /(?<!<[^>]*|`[^`]*|\[[^\]]*\]\()https?:\/\/[^\s<]+/gi,
    (match) => `<a href="${match}" class="link link-primary" target="_blank" rel="noopener noreferrer">${match}</a>`
  );

  // 6. Bold and Italic
  processedText = processedText
    .replace(/\*\*([^*]+?)\*\*/g, '<strong class="font-semibold">$1</strong>')
    .replace(/\*([^*]+?)\*/g, '<em class="italic">$1</em>');

  // 7. Blockquotes
  processedText = processedText
    .replace(/^> (.*$)/gim, '<blockquote class="border-l-4 border-primary pl-4 my-2 italic text-base-content/80">$1</blockquote>');

  // 8. Lists (checkboxes first)
  processedText = processedText
    .replace(/^- \[ \] (.*$)/gm, '<li class="ml-4 flex items-center gap-2"><input type="checkbox" class="checkbox checkbox-sm" disabled> <span>$1</span></li>')
    .replace(/^- \[x\] (.*$)/gim, '<li class="ml-4 flex items-center gap-2"><input type="checkbox" class="checkbox checkbox-sm" checked disabled> <span class="line-through text-base-content/60">$1</span></li>')
    .replace(/^- (.*$)/gm, '<li class="ml-4 list-disc list-inside">$1</li>')
    .replace(/^\* (.*$)/gm, '<li class="ml-4 list-disc list-inside">$1</li>')
    .replace(/^\d+\. (.*$)/gm, '<li class="ml-4 list-decimal list-inside">$1</li>');

  processedText = processedText.replace(/<\/li>\n/g, '</li>');
  processedText = processedText.replace(/<\/h[1-6]>\n/g, (match) => match.replace('\n', ''));

  // 9. Line breaks
  processedText = processedText.replace(/\n(?!<\/)/gim, '<br>');

  return processedText;
}
