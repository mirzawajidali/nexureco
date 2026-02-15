import { useEffect, useState, useCallback, useRef } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';
import TextAlign from '@tiptap/extension-text-align';
import Link from '@tiptap/extension-link';
import Image from '@tiptap/extension-image';
import Placeholder from '@tiptap/extension-placeholder';
import TextStyle from '@tiptap/extension-text-style';
import Color from '@tiptap/extension-color';
import { clsx } from 'clsx';

// --- Icons (inline SVGs to match Shopify's toolbar) ---

function IconBold({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M6 4h8a4 4 0 0 1 4 4 4 4 0 0 1-4 4H6z" />
      <path d="M6 12h9a4 4 0 0 1 4 4 4 4 0 0 1-4 4H6z" />
    </svg>
  );
}

function IconItalic({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="19" y1="4" x2="10" y2="4" />
      <line x1="14" y1="20" x2="5" y2="20" />
      <line x1="15" y1="4" x2="9" y2="20" />
    </svg>
  );
}

function IconUnderline({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M6 3v7a6 6 0 0 0 6 6 6 6 0 0 0 6-6V3" />
      <line x1="4" y1="21" x2="20" y2="21" />
    </svg>
  );
}

function IconAlignLeft({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <line x1="3" y1="6" x2="21" y2="6" />
      <line x1="3" y1="12" x2="15" y2="12" />
      <line x1="3" y1="18" x2="18" y2="18" />
    </svg>
  );
}

function IconAlignCenter({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <line x1="3" y1="6" x2="21" y2="6" />
      <line x1="6" y1="12" x2="18" y2="12" />
      <line x1="4" y1="18" x2="20" y2="18" />
    </svg>
  );
}

function IconAlignRight({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <line x1="3" y1="6" x2="21" y2="6" />
      <line x1="9" y1="12" x2="21" y2="12" />
      <line x1="6" y1="18" x2="21" y2="18" />
    </svg>
  );
}

function IconLink({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
      <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
    </svg>
  );
}

function IconImage({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
      <circle cx="8.5" cy="8.5" r="1.5" />
      <polyline points="21 15 16 10 5 21" />
    </svg>
  );
}

function IconCode({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="16 18 22 12 16 6" />
      <polyline points="8 6 2 12 8 18" />
    </svg>
  );
}

function IconList({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <line x1="8" y1="6" x2="21" y2="6" />
      <line x1="8" y1="12" x2="21" y2="12" />
      <line x1="8" y1="18" x2="21" y2="18" />
      <circle cx="4" cy="6" r="1" fill="currentColor" />
      <circle cx="4" cy="12" r="1" fill="currentColor" />
      <circle cx="4" cy="18" r="1" fill="currentColor" />
    </svg>
  );
}

function IconOrderedList({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <line x1="10" y1="6" x2="21" y2="6" />
      <line x1="10" y1="12" x2="21" y2="12" />
      <line x1="10" y1="18" x2="21" y2="18" />
      <text x="3" y="8" fontSize="7" fill="currentColor" stroke="none" fontFamily="sans-serif">1</text>
      <text x="3" y="14" fontSize="7" fill="currentColor" stroke="none" fontFamily="sans-serif">2</text>
      <text x="3" y="20" fontSize="7" fill="currentColor" stroke="none" fontFamily="sans-serif">3</text>
    </svg>
  );
}

function ChevronDown({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 20 20" fill="currentColor">
      <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z" clipRule="evenodd" />
    </svg>
  );
}

// --- Toolbar button ---

function ToolbarBtn({
  active,
  onClick,
  title,
  children,
  className: extraClass,
}: {
  active?: boolean;
  onClick: () => void;
  title: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      className={clsx(
        'p-1.5 rounded transition-colors',
        active ? 'bg-gray-200 text-gray-900' : 'text-gray-500 hover:bg-gray-100 hover:text-gray-700',
        extraClass,
      )}
    >
      {children}
    </button>
  );
}

function ToolbarDivider() {
  return <div className="w-px h-5 bg-gray-200 mx-1" />;
}

// --- Color presets ---

const TEXT_COLORS = [
  { label: 'Default', value: '' },
  { label: 'Red', value: '#dc2626' },
  { label: 'Orange', value: '#ea580c' },
  { label: 'Green', value: '#16a34a' },
  { label: 'Blue', value: '#2563eb' },
  { label: 'Purple', value: '#9333ea' },
  { label: 'Gray', value: '#6b7280' },
];

// --- Props ---

interface RichTextEditorProps {
  content: string;
  onChange: (html: string) => void;
  placeholder?: string;
}

// --- Component ---

export default function RichTextEditor({
  content,
  onChange,
  placeholder = '',
}: RichTextEditorProps) {
  const [showHtml, setShowHtml] = useState(false);
  const [htmlSource, setHtmlSource] = useState('');
  const [showHeadingMenu, setShowHeadingMenu] = useState(false);
  const [showAlignMenu, setShowAlignMenu] = useState(false);
  const [showColorMenu, setShowColorMenu] = useState(false);
  const headingRef = useRef<HTMLDivElement>(null);
  const alignRef = useRef<HTMLDivElement>(null);
  const colorRef = useRef<HTMLDivElement>(null);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3, 4, 5, 6] },
      }),
      Underline,
      TextStyle,
      Color,
      TextAlign.configure({
        types: ['heading', 'paragraph'],
      }),
      Link.configure({
        openOnClick: false,
        HTMLAttributes: { class: 'text-blue-600 underline cursor-pointer' },
      }),
      Image.configure({
        HTMLAttributes: { class: 'max-w-full rounded' },
      }),
      Placeholder.configure({ placeholder }),
    ],
    content,
    onUpdate: ({ editor: ed }) => {
      onChange(ed.getHTML());
    },
    editorProps: {
      attributes: {
        class: 'prose prose-sm max-w-none px-3 py-3 min-h-[160px] focus:outline-none',
      },
    },
  });

  // Sync external content changes (e.g. form reset)
  useEffect(() => {
    if (editor && content !== editor.getHTML()) {
      editor.commands.setContent(content, false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [content]);

  // Close dropdowns on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (headingRef.current && !headingRef.current.contains(e.target as Node)) {
        setShowHeadingMenu(false);
      }
      if (alignRef.current && !alignRef.current.contains(e.target as Node)) {
        setShowAlignMenu(false);
      }
      if (colorRef.current && !colorRef.current.contains(e.target as Node)) {
        setShowColorMenu(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const toggleHtmlView = useCallback(() => {
    if (!editor) return;
    if (!showHtml) {
      setHtmlSource(editor.getHTML());
    } else {
      editor.commands.setContent(htmlSource, true);
      onChange(htmlSource);
    }
    setShowHtml(!showHtml);
  }, [editor, showHtml, htmlSource, onChange]);

  const setLink = useCallback(() => {
    if (!editor) return;
    const previousUrl = editor.getAttributes('link').href;
    const url = window.prompt('URL', previousUrl);
    if (url === null) return;
    if (url === '') {
      editor.chain().focus().extendMarkRange('link').unsetLink().run();
      return;
    }
    editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run();
  }, [editor]);

  const addImage = useCallback(() => {
    if (!editor) return;
    const url = window.prompt('Image URL');
    if (url) {
      editor.chain().focus().setImage({ src: url }).run();
    }
  }, [editor]);

  if (!editor) return null;

  // Current heading label
  const headingLevel = [1, 2, 3, 4, 5, 6].find((l) =>
    editor.isActive('heading', { level: l }),
  );
  const headingLabel = headingLevel ? `Heading ${headingLevel}` : 'Paragraph';

  return (
    <div className="border border-gray-300 rounded-lg overflow-hidden focus-within:ring-1 focus-within:ring-gray-400 focus-within:border-gray-400">
      {/* Toolbar */}
      <div className="flex items-center gap-0 px-2 py-1.5 border-b border-gray-200 bg-gray-50/80 flex-wrap">
        {/* Paragraph / Heading dropdown */}
        <div className="relative" ref={headingRef}>
          <button
            type="button"
            onClick={() => {
              setShowHeadingMenu(!showHeadingMenu);
              setShowAlignMenu(false);
              setShowColorMenu(false);
            }}
            className="inline-flex items-center gap-1 px-2 py-1.5 text-sm text-gray-700 hover:bg-gray-100 rounded transition-colors"
          >
            <span className="min-w-[70px] text-left">{headingLabel}</span>
            <ChevronDown className="h-3.5 w-3.5 text-gray-400" />
          </button>

          {showHeadingMenu && (
            <div className="absolute top-full left-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-20 py-1 min-w-[140px]">
              <button
                type="button"
                onClick={() => {
                  editor.chain().focus().setParagraph().run();
                  setShowHeadingMenu(false);
                }}
                className={clsx(
                  'block w-full text-left px-3 py-1.5 text-sm hover:bg-gray-50 transition-colors',
                  !headingLevel ? 'font-medium text-gray-900' : 'text-gray-600',
                )}
              >
                Paragraph
              </button>
              {([1, 2, 3, 4, 5, 6] as const).map((level) => (
                <button
                  key={level}
                  type="button"
                  onClick={() => {
                    editor.chain().focus().toggleHeading({ level }).run();
                    setShowHeadingMenu(false);
                  }}
                  className={clsx(
                    'block w-full text-left px-3 py-1.5 hover:bg-gray-50 transition-colors',
                    editor.isActive('heading', { level })
                      ? 'font-medium text-gray-900'
                      : 'text-gray-600',
                    level === 1 && 'text-lg font-bold',
                    level === 2 && 'text-base font-semibold',
                    level === 3 && 'text-sm font-semibold',
                    level >= 4 && 'text-sm',
                  )}
                >
                  Heading {level}
                </button>
              ))}
            </div>
          )}
        </div>

        <ToolbarDivider />

        {/* Bold / Italic / Underline */}
        <ToolbarBtn
          active={editor.isActive('bold')}
          onClick={() => editor.chain().focus().toggleBold().run()}
          title="Bold (Ctrl+B)"
        >
          <IconBold className="h-4 w-4" />
        </ToolbarBtn>
        <ToolbarBtn
          active={editor.isActive('italic')}
          onClick={() => editor.chain().focus().toggleItalic().run()}
          title="Italic (Ctrl+I)"
        >
          <IconItalic className="h-4 w-4" />
        </ToolbarBtn>
        <ToolbarBtn
          active={editor.isActive('underline')}
          onClick={() => editor.chain().focus().toggleUnderline().run()}
          title="Underline (Ctrl+U)"
        >
          <IconUnderline className="h-4 w-4" />
        </ToolbarBtn>

        {/* Text color */}
        <div className="relative" ref={colorRef}>
          <button
            type="button"
            onClick={() => {
              setShowColorMenu(!showColorMenu);
              setShowHeadingMenu(false);
              setShowAlignMenu(false);
            }}
            title="Text color"
            className="p-1.5 rounded transition-colors text-gray-500 hover:bg-gray-100 hover:text-gray-700 inline-flex items-center"
          >
            <span className="text-sm font-semibold leading-none" style={{ color: editor.getAttributes('textStyle').color || undefined }}>
              A
            </span>
            <ChevronDown className="h-3 w-3 text-gray-400 ml-0.5" />
          </button>

          {showColorMenu && (
            <div className="absolute top-full left-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-20 py-1 min-w-[120px]">
              {TEXT_COLORS.map((c) => (
                <button
                  key={c.label}
                  type="button"
                  onClick={() => {
                    if (c.value) {
                      editor.chain().focus().setColor(c.value).run();
                    } else {
                      editor.chain().focus().unsetColor().run();
                    }
                    setShowColorMenu(false);
                  }}
                  className="flex items-center gap-2 w-full text-left px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-50 transition-colors"
                >
                  <span
                    className="w-3.5 h-3.5 rounded-full border border-gray-200 flex-shrink-0"
                    style={{ backgroundColor: c.value || '#000' }}
                  />
                  {c.label}
                </button>
              ))}
            </div>
          )}
        </div>

        <ToolbarDivider />

        {/* Alignment dropdown */}
        <div className="relative" ref={alignRef}>
          <button
            type="button"
            onClick={() => {
              setShowAlignMenu(!showAlignMenu);
              setShowHeadingMenu(false);
              setShowColorMenu(false);
            }}
            title="Text alignment"
            className="inline-flex items-center gap-0.5 p-1.5 rounded transition-colors text-gray-500 hover:bg-gray-100 hover:text-gray-700"
          >
            {editor.isActive({ textAlign: 'center' }) ? (
              <IconAlignCenter className="h-4 w-4" />
            ) : editor.isActive({ textAlign: 'right' }) ? (
              <IconAlignRight className="h-4 w-4" />
            ) : (
              <IconAlignLeft className="h-4 w-4" />
            )}
            <ChevronDown className="h-3 w-3 text-gray-400" />
          </button>

          {showAlignMenu && (
            <div className="absolute top-full left-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-20 py-1">
              {[
                { value: 'left', icon: IconAlignLeft, label: 'Left' },
                { value: 'center', icon: IconAlignCenter, label: 'Center' },
                { value: 'right', icon: IconAlignRight, label: 'Right' },
              ].map((a) => (
                <button
                  key={a.value}
                  type="button"
                  onClick={() => {
                    editor.chain().focus().setTextAlign(a.value).run();
                    setShowAlignMenu(false);
                  }}
                  className={clsx(
                    'flex items-center gap-2 w-full text-left px-3 py-1.5 text-sm hover:bg-gray-50 transition-colors',
                    editor.isActive({ textAlign: a.value })
                      ? 'text-gray-900 font-medium'
                      : 'text-gray-600',
                  )}
                >
                  <a.icon className="h-4 w-4" />
                  {a.label}
                </button>
              ))}
            </div>
          )}
        </div>

        <ToolbarDivider />

        {/* Lists */}
        <ToolbarBtn
          active={editor.isActive('bulletList')}
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          title="Bullet list"
        >
          <IconList className="h-4 w-4" />
        </ToolbarBtn>
        <ToolbarBtn
          active={editor.isActive('orderedList')}
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          title="Numbered list"
        >
          <IconOrderedList className="h-4 w-4" />
        </ToolbarBtn>

        <ToolbarDivider />

        {/* Link */}
        <ToolbarBtn
          active={editor.isActive('link')}
          onClick={setLink}
          title="Insert link"
        >
          <IconLink className="h-4 w-4" />
        </ToolbarBtn>

        {/* Image */}
        <ToolbarBtn
          active={false}
          onClick={addImage}
          title="Insert image"
        >
          <IconImage className="h-4 w-4" />
        </ToolbarBtn>

        {/* Spacer to push HTML toggle right */}
        <div className="flex-1" />

        {/* HTML source toggle */}
        <ToolbarBtn
          active={showHtml}
          onClick={toggleHtmlView}
          title="HTML source"
        >
          <IconCode className="h-4 w-4" />
        </ToolbarBtn>
      </div>

      {/* Editor or HTML source */}
      {showHtml ? (
        <textarea
          value={htmlSource}
          onChange={(e) => setHtmlSource(e.target.value)}
          className="w-full px-3 py-3 text-sm font-mono text-gray-700 min-h-[160px] focus:outline-none resize-y bg-gray-50/30"
          spellCheck={false}
        />
      ) : (
        <EditorContent editor={editor} />
      )}
    </div>
  );
}
