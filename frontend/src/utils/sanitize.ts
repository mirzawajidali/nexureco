import DOMPurify from 'dompurify';

// Links that open a new tab can't reach back into this page
DOMPurify.addHook('afterSanitizeAttributes', (node) => {
  if (node instanceof HTMLAnchorElement && node.target === '_blank') {
    node.setAttribute('rel', 'noopener noreferrer');
  }
});

/**
 * Admin-entered rich text (product descriptions, CMS pages) made safe to render: no scripts, event
 * handlers, javascript: links, frames or form fields. The server already cleans it when it's saved
 * (backend app/utils/html_sanitize.py); this also covers content saved before that.
 */
export function cleanHtml(html: string | null | undefined): string {
  if (!html) return '';
  return DOMPurify.sanitize(html, {
    ADD_ATTR: ['target'],
    FORBID_TAGS: ['style', 'form', 'input', 'button', 'textarea', 'select', 'option'],
    FORBID_ATTR: ['action', 'formaction'],
  });
}
