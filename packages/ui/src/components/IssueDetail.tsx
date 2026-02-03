import { marked, Renderer } from "marked";
import hljs from "highlight.js";
import "highlight.js/styles/github-dark.css";
import type { Issue } from "../App";
import { Badge } from "./Badge";
import { formatDisplayDate, formatFullDate } from "@issy/core";

interface IssueDetailProps {
  issue: Issue;
  onBack?: () => void;
  onEdit?: () => void;
  onClose?: () => void;
  onReopen?: () => void;
  onDelete?: () => void;
}

// Custom renderer with syntax highlighting
const renderer = new Renderer();
renderer.code = function({ text, lang }) {
  const language = lang && hljs.getLanguage(lang) ? lang : "plaintext";
  const highlighted = hljs.highlight(text, { language }).value;
  return `<pre><code class="hljs language-${language}">${highlighted}</code></pre>`;
};

marked.setOptions({
  gfm: true,
  breaks: true,
  renderer,
});

export function IssueDetail({ issue, onBack, onEdit, onClose, onReopen, onDelete }: IssueDetailProps) {
  const labels = issue.frontmatter.labels?.split(',').map(l => l.trim()).filter(Boolean) || [];
  const isOpen = issue.frontmatter.status === 'open';

  return (
    <div className="max-w-[800px] mx-auto px-4 md:px-10 py-6 md:py-8">
      {/* Mobile back button */}
      {onBack && (
        <button 
          onClick={onBack}
          className="md:hidden inline-flex items-center gap-1.5 mb-4 text-text-secondary text-sm"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M15 19l-7-7 7-7" />
          </svg>
          Back to issues
        </button>
      )}
      
      <div className="mb-6">
        <div className="flex items-start justify-between gap-3 mb-3">
          <h1 className="text-xl md:text-2xl font-semibold text-text-primary leading-tight">
            {issue.frontmatter.title || "Untitled Issue"}
            <span className="font-normal text-text-muted ml-2">#{issue.id}</span>
          </h1>
          
          {/* Action buttons */}
          <div className="flex items-center gap-1 shrink-0">
            {onEdit && (
              <button
                onClick={onEdit}
                title="Edit issue"
                className="p-2 text-text-muted hover:text-text-primary hover:bg-surface rounded-lg transition-colors"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                  <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                </svg>
              </button>
            )}
            
            {onDelete && (
              <button
                onClick={onDelete}
                title="Delete issue"
                className="p-2 text-text-muted hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                </svg>
              </button>
            )}
            
            {isOpen && onClose && (
              <button
                onClick={onClose}
                title="Close issue"
                className="ml-1 px-3 py-1.5 text-xs font-medium text-text-secondary hover:text-text-primary bg-surface hover:bg-surface-elevated border border-border rounded-lg transition-colors"
              >
                Close
              </button>
            )}
            
            {!isOpen && onReopen && (
              <button
                onClick={onReopen}
                title="Reopen issue"
                className="ml-1 px-3 py-1.5 text-xs font-medium text-green-400 hover:text-green-300 bg-green-500/10 hover:bg-green-500/20 border border-green-500/30 rounded-lg transition-colors"
              >
                Reopen
              </button>
            )}
          </div>
        </div>
        
        {issue.frontmatter.description && (
          <p className="text-[15px] text-text-secondary leading-relaxed mb-4">
            {issue.frontmatter.description}
          </p>
        )}
        
        <div className="flex flex-wrap items-center gap-2 text-sm">
          {issue.frontmatter.priority && (
            <Badge variant="priority" value={issue.frontmatter.priority} />
          )}
          
          {issue.frontmatter.status && (
            <Badge variant="status" value={issue.frontmatter.status} />
          )}
          
          {issue.frontmatter.type && (
            <Badge variant="type" value={issue.frontmatter.type} />
          )}
          
          {labels.map((label) => (
            <Badge key={label} variant="label" value={label} />
          ))}
          
          {issue.frontmatter.created && (
            <span 
              className="text-xs text-text-muted"
              title={formatFullDate(issue.frontmatter.created)}
            >
              {formatDisplayDate(issue.frontmatter.created)}
            </span>
          )}
        </div>
      </div>
      
      <hr className="border-0 border-t border-border my-6" />
      
      <div 
        className="prose prose-invert prose-sm max-w-none prose-a:text-accent prose-pre:border-0 prose-pre:shadow-none prose-code:bg-surface-elevated prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded prose-code:before:content-none prose-code:after:content-none"
        dangerouslySetInnerHTML={{ __html: marked.parse(issue.content) as string }}
      />
    </div>
  );
}
