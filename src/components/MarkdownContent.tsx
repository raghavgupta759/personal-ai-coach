import React, { useState } from 'react';
import { Copy, Check } from 'lucide-react';

interface MarkdownContentProps {
  content: string;
  isStreaming?: boolean;
}

export const MarkdownContent: React.FC<MarkdownContentProps> = ({ content, isStreaming }) => {
  // Clean out trailing citations/follow-ups block from display if it started streaming
  const cleanContent = content
    .replace(/\n*---\s*\n*\*{0,2}(?:CITATIONS|FOLLOW_UPS|SUGGESTIONS):?\*{0,2}[\s\S]*$/i, '')
    .replace(/\*{0,2}(?:CITATIONS|FOLLOW_UPS|SUGGESTIONS):?\*{0,2}[\s\S]*$/i, '');

  const blocks = parseMarkdownBlocks(cleanContent);

  return (
    <div className="space-y-3 text-slate-200 text-xs sm:text-sm leading-relaxed break-words font-normal">
      {blocks.map((block, idx) => {
        if (block.type === 'code') {
          return <CodeBlock key={idx} language={block.language} code={block.text} />;
        }
        if (block.type === 'header') {
          if (block.level === 1) {
            return (
              <h1 key={idx} className="text-lg sm:text-xl font-bold text-white tracking-tight mt-3 mb-1.5 flex items-center gap-2">
                <span className="w-1.5 h-5 bg-gradient-to-b from-cyan-400 to-violet-500 rounded-full" />
                <span>{renderInlineText(block.text)}</span>
              </h1>
            );
          }
          if (block.level === 2) {
            return (
              <h2 key={idx} className="text-base sm:text-lg font-bold text-white tracking-tight mt-3 mb-1 flex items-center gap-2">
                <span className="w-1.5 h-4 bg-cyan-400 rounded-full" />
                <span>{renderInlineText(block.text)}</span>
              </h2>
            );
          }
          return (
            <h3 key={idx} className="text-sm sm:text-base font-semibold text-cyan-200 tracking-tight mt-2.5 mb-1">
              {renderInlineText(block.text)}
            </h3>
          );
        }
        if (block.type === 'list') {
          return (
            <ul key={idx} className="space-y-1.5 pl-1 my-2">
              {block.items.map((item, itemIdx) => (
                <li key={itemIdx} className="flex items-start gap-2 text-slate-300">
                  <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 shrink-0 mt-2 shadow-[0_0_6px_#22d3ee]" />
                  <span className="flex-1">{renderInlineText(item)}</span>
                </li>
              ))}
            </ul>
          );
        }
        if (block.type === 'ordered-list') {
          return (
            <ol key={idx} className="space-y-1.5 pl-1 my-2">
              {block.items.map((item, itemIdx) => (
                <li key={itemIdx} className="flex items-start gap-2 text-slate-300">
                  <span className="w-5 h-5 rounded-md bg-slate-900 border border-violet-500/30 text-[10px] font-bold text-violet-300 flex items-center justify-center shrink-0 mt-0.5">
                    {itemIdx + 1}
                  </span>
                  <span className="flex-1">{renderInlineText(item)}</span>
                </li>
              ))}
            </ol>
          );
        }
        if (block.type === 'blockquote') {
          return (
            <blockquote
              key={idx}
              className="border-l-2 border-violet-500/70 bg-violet-950/20 pl-3.5 py-1.5 my-2 rounded-r-lg text-slate-300 italic"
            >
              {renderInlineText(block.text)}
            </blockquote>
          );
        }
        if (block.type === 'hr') {
          return <hr key={idx} className="border-slate-800 my-3" />;
        }
        return (
          <p key={idx} className="text-slate-300">
            {renderInlineText(block.text)}
            {isStreaming && idx === blocks.length - 1 && (
              <span className="inline-block w-1.5 h-4 ml-1 align-middle bg-cyan-400 rounded-sm animate-pulse shadow-[0_0_8px_#22d3ee]" />
            )}
          </p>
        );
      })}
    </div>
  );
};

// Code block with copy button
const CodeBlock: React.FC<{ language?: string; code: string }> = ({ language, code }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="my-2.5 rounded-xl overflow-hidden border border-slate-800 bg-slate-950/90 shadow-xl">
      <div className="flex items-center justify-between px-3.5 py-1.5 bg-slate-900/90 border-b border-slate-800 text-[11px] font-mono text-slate-400">
        <span className="uppercase text-[10px] tracking-wider text-cyan-400 font-semibold">
          {language || 'code'}
        </span>
        <button
          onClick={handleCopy}
          className="flex items-center gap-1 hover:text-white transition-colors cursor-pointer text-[10px]"
          title="Copy code"
        >
          {copied ? (
            <>
              <Check className="w-3 h-3 text-emerald-400" />
              <span className="text-emerald-400">Copied</span>
            </>
          ) : (
            <>
              <Copy className="w-3 h-3" />
              <span>Copy</span>
            </>
          )}
        </button>
      </div>
      <pre className="p-3.5 text-xs font-mono overflow-x-auto text-slate-200 leading-relaxed scrollbar-thin">
        <code>{code}</code>
      </pre>
    </div>
  );
};

// Inline parser for bold, italics, code, and links
function renderInlineText(text: string): React.ReactNode {
  if (!text) return null;

  // Split by inline code first
  const parts: React.ReactNode[] = [];
  const codeRegex = /`([^`]+)`/g;
  let lastIndex = 0;
  let match;

  while ((match = codeRegex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push(...formatTextWithStyles(text.substring(lastIndex, match.index)));
    }
    parts.push(
      <code
        key={`code-${match.index}`}
        className="px-1.5 py-0.5 rounded-md bg-slate-900 border border-violet-500/30 text-cyan-300 font-mono text-[11px] sm:text-xs mx-0.5"
      >
        {match[1]}
      </code>
    );
    lastIndex = match.index + match[0].length;
  }

  if (lastIndex < text.length) {
    parts.push(...formatTextWithStyles(text.substring(lastIndex)));
  }

  return parts;
}

function formatTextWithStyles(raw: string): React.ReactNode[] {
  // Handle bold (**text**) and italics (*text*)
  const nodes: React.ReactNode[] = [];
  const boldRegex = /\*\*([^*]+)\*\*/g;
  let lastIdx = 0;
  let match;

  while ((match = boldRegex.exec(raw)) !== null) {
    if (match.index > lastIdx) {
      nodes.push(raw.substring(lastIdx, match.index));
    }
    nodes.push(
      <strong key={`bold-${match.index}`} className="font-bold text-white">
        {match[1]}
      </strong>
    );
    lastIdx = match.index + match[0].length;
  }

  if (lastIdx < raw.length) {
    nodes.push(raw.substring(lastIdx));
  }

  return nodes;
}

// Block parser
interface Block {
  type: 'paragraph' | 'header' | 'list' | 'ordered-list' | 'code' | 'blockquote' | 'hr';
  text: string;
  items: string[];
  level?: number;
  language?: string;
}

function parseMarkdownBlocks(text: string): Block[] {
  const lines = text.split('\n');
  const blocks: Block[] = [];
  let inCodeBlock = false;
  let codeBuffer: string[] = [];
  let codeLang = '';
  let currentList: string[] = [];
  let listType: 'list' | 'ordered-list' | null = null;
  let currentParagraph: string[] = [];

  const flushParagraph = () => {
    if (currentParagraph.length > 0) {
      blocks.push({
        type: 'paragraph',
        text: currentParagraph.join(' '),
        items: [],
      });
      currentParagraph = [];
    }
  };

  const flushList = () => {
    if (currentList.length > 0 && listType) {
      blocks.push({
        type: listType,
        text: '',
        items: [...currentList],
      });
      currentList = [];
      listType = null;
    }
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Code fence
    if (line.trim().startsWith('```')) {
      if (inCodeBlock) {
        // closing code block
        blocks.push({
          type: 'code',
          text: codeBuffer.join('\n'),
          items: [],
          language: codeLang,
        });
        codeBuffer = [];
        codeLang = '';
        inCodeBlock = false;
      } else {
        // opening code block
        flushParagraph();
        flushList();
        inCodeBlock = true;
        codeLang = line.trim().replace(/^```/, '').trim();
      }
      continue;
    }

    if (inCodeBlock) {
      codeBuffer.push(line);
      continue;
    }

    const trimmed = line.trim();

    // Empty line
    if (!trimmed) {
      flushParagraph();
      flushList();
      continue;
    }

    // HR
    if (/^(---|___|\*\*\*)$/.test(trimmed)) {
      flushParagraph();
      flushList();
      blocks.push({ type: 'hr', text: '', items: [] });
      continue;
    }

    // Headers
    const headerMatch = trimmed.match(/^(#{1,4})\s+(.+)$/);
    if (headerMatch) {
      flushParagraph();
      flushList();
      blocks.push({
        type: 'header',
        level: headerMatch[1].length,
        text: headerMatch[2],
        items: [],
      });
      continue;
    }

    // Blockquote
    if (trimmed.startsWith('>')) {
      flushParagraph();
      flushList();
      blocks.push({
        type: 'blockquote',
        text: trimmed.replace(/^>\s*/, ''),
        items: [],
      });
      continue;
    }

    // Unordered List
    const bulletMatch = trimmed.match(/^[-*•]\s+(.+)$/);
    if (bulletMatch) {
      flushParagraph();
      if (listType !== 'list') {
        flushList();
        listType = 'list';
      }
      currentList.push(bulletMatch[1]);
      continue;
    }

    // Ordered List
    const orderedMatch = trimmed.match(/^\d+[.)]\s+(.+)$/);
    if (orderedMatch) {
      flushParagraph();
      if (listType !== 'ordered-list') {
        flushList();
        listType = 'ordered-list';
      }
      currentList.push(orderedMatch[1]);
      continue;
    }

    // Standard paragraph text
    if (listType) {
      flushList();
    }
    currentParagraph.push(trimmed);
  }

  // Handle unclosed code block (e.g. during live streaming)
  if (inCodeBlock) {
    blocks.push({
      type: 'code',
      text: codeBuffer.join('\n'),
      items: [],
      language: codeLang,
    });
  }

  flushList();
  flushParagraph();

  return blocks;
}
