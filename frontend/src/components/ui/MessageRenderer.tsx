'use client'

import React from 'react'
import Markdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { Check, Copy } from 'lucide-react'
import { StreamingCursor } from './StreamingCursor'
import { ReasoningViewer } from './ReasoningViewer'

interface MessageRendererProps {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: Date
  reasoning?: string  // Extended Thinking reasoning content
  isStreaming?: boolean  // Whether message is being streamed
  onCopy?: (content: string, messageId: string) => void
  copiedMessageId?: string
}

/**
 * MessageRenderer Component with Markdown Rendering
 *
 * Renders chat messages with proper styling based on role.
 * Assistant messages support markdown formatting with:
 * - Headers (H1-H6)
 * - Bold, italics, strikethrough
 * - Lists (ordered and unordered)
 * - Code blocks with syntax highlighting
 * - Tables (with remark-gfm)
 * - Links and images
 */
export function MessageRenderer({
  id,
  role,
  content,
  timestamp,
  reasoning,
  isStreaming = false,
  onCopy,
  copiedMessageId,
}: MessageRendererProps) {
  const isUser = role === 'user'
  const isAssistant = role === 'assistant'

  return (
    <div className={`flex flex-col ${isUser ? 'items-end' : 'items-start'} mb-4`}>
      {/* Reasoning Viewer - only for assistant messages with reasoning */}
      {isAssistant && reasoning && (
        <ReasoningViewer
          content={reasoning}
          isStreaming={isStreaming && !content}
          className="mb-2 max-w-[80%]"
        />
      )}

      {/* Message Bubble */}
      <div
        className={`max-w-[80%] ${
          isUser
            ? 'bg-purple-600/80 text-white rounded-l-lg rounded-tr-lg'
            : 'bg-black/60 text-purple-100 rounded-r-lg rounded-tl-lg border border-purple-500/30'
        } backdrop-blur-sm p-4 shadow-lg relative group`}
      >
        {/* Markdown content for assistant messages, plain text for user */}
        {isAssistant ? (
          <div className="prose prose-invert max-w-none text-sm">
            <Markdown
              remarkPlugins={[remarkGfm]}
              components={{
                // Headers
                h1: ({ node, ...props }) => (
                  <h1 className="text-xl font-bold mt-4 mb-2 text-purple-200" {...props} />
                ),
                h2: ({ node, ...props }) => (
                  <h2 className="text-lg font-bold mt-3 mb-2 text-purple-200" {...props} />
                ),
                h3: ({ node, ...props }) => (
                  <h3 className="text-base font-bold mt-2 mb-1 text-purple-300" {...props} />
                ),
                h4: ({ node, ...props }) => (
                  <h4 className="text-base font-bold mt-2 mb-1 text-purple-300" {...props} />
                ),
                h5: ({ node, ...props }) => (
                  <h5 className="font-semibold mt-2 mb-1 text-purple-300" {...props} />
                ),
                h6: ({ node, ...props }) => (
                  <h6 className="font-semibold mt-2 mb-1 text-purple-300" {...props} />
                ),

                // Paragraphs
                p: ({ node, ...props }) => (
                  <p className="text-purple-100 mb-3 leading-relaxed" {...props} />
                ),

                // Lists
                ul: ({ node, ...props }) => (
                  <ul
                    className="list-disc list-inside mb-3 pl-4 text-purple-100 space-y-1"
                    {...props}
                  />
                ),
                ol: ({ node, ...props }) => (
                  <ol
                    className="list-decimal list-inside mb-3 pl-4 text-purple-100 space-y-1"
                    {...props}
                  />
                ),
                li: ({ node, ...props }) => (
                  <li className="text-purple-100" {...props} />
                ),

                // Code blocks
                code: ({ node, inline, className, ...props }: any) => {
                  const match = /language-(\w+)/.exec(className || '')
                  const language = match ? match[1] : 'plain'

                  if (inline) {
                    return (
                      <code
                        className="bg-purple-950/50 text-purple-200 px-2 py-1 rounded font-mono text-sm border border-purple-700/30"
                        {...props}
                      />
                    )
                  }

                  return (
                    <div className="bg-purple-950/40 border border-purple-700/30 rounded-lg p-3 mb-3 overflow-x-auto">
                      <div className="text-xs text-purple-300 mb-2 opacity-70">{language}</div>
                      <code
                        className="text-purple-100 font-mono text-sm block whitespace-pre-wrap"
                        {...props}
                      />
                    </div>
                  )
                },

                // Inline formatting
                strong: ({ node, ...props }) => (
                  <strong className="font-bold text-purple-50" {...props} />
                ),
                em: ({ node, ...props }) => (
                  <em className="italic text-purple-100" {...props} />
                ),

                // Links
                a: ({ node, href, ...props }: any) => (
                  <a
                    href={href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-purple-300 hover:text-purple-200 underline transition-colors"
                    {...props}
                  />
                ),

                // Blockquotes
                blockquote: ({ node, ...props }) => (
                  <blockquote
                    className="border-l-4 border-purple-500 pl-4 py-2 my-3 text-purple-200 italic bg-purple-950/20"
                    {...props}
                  />
                ),

                // Tables (from remark-gfm)
                table: ({ node, ...props }) => (
                  <table
                    className="w-full border-collapse mb-3 text-sm border border-purple-700/30"
                    {...props}
                  />
                ),
                thead: ({ node, ...props }) => (
                  <thead
                    className="bg-purple-900/40 border-b border-purple-700/30"
                    {...props}
                  />
                ),
                tbody: ({ node, ...props }) => (
                  <tbody className="divide-y divide-purple-700/30" {...props} />
                ),
                tr: ({ node, ...props }) => (
                  <tr className="divide-x divide-purple-700/30" {...props} />
                ),
                td: ({ node, ...props }) => (
                  <td className="px-3 py-2 text-purple-100" {...props} />
                ),
                th: ({ node, ...props }) => (
                  <th className="px-3 py-2 text-purple-50 font-semibold text-left" {...props} />
                ),

                // Horizontal rule
                hr: ({ node, ...props }) => (
                  <hr className="border-t border-purple-700/30 my-4" {...props} />
                ),
              }}
            >
              {content}
            </Markdown>
            {isStreaming && isAssistant && <StreamingCursor />}
          </div>
        ) : (
          // User messages: plain text
          <p className="text-sm whitespace-pre-wrap">{content}</p>
        )}

        {/* Message footer with timestamp and copy button */}
        <div className="flex items-center justify-between mt-3 pt-2 border-t border-purple-500/20">
          <span className="text-xs opacity-60">
            {timestamp.toLocaleTimeString([], {
              hour: '2-digit',
              minute: '2-digit',
            })}
          </span>
          {onCopy && (
            <button
              onClick={() => onCopy(content, id)}
              className="text-purple-300 hover:text-purple-100 transition-colors opacity-0 group-hover:opacity-100"
              title="Copy message"
              aria-label={`Copy ${role} message`}
            >
              {copiedMessageId === id ? (
                <Check size={14} className="text-green-400" />
              ) : (
                <Copy size={14} />
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
