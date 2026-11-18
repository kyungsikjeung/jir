import { useEffect } from 'react';
import { useEditor, EditorContent, type Editor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import CodeBlockLowlight from '@tiptap/extension-code-block-lowlight';
import { createLowlight, common } from 'lowlight';

const lowlight = createLowlight(common);

interface Props {
  value?: any;
  onChange?: (json: any, html: string, text: string) => void;
  editable?: boolean;
  placeholder?: string;
}

function ToolbarButton({
  onClick,
  active,
  disabled,
  title,
  children,
}: {
  onClick: () => void;
  active?: boolean;
  disabled?: boolean;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      title={title}
      disabled={disabled}
      onMouseDown={(e) => e.preventDefault()}
      onClick={onClick}
      className={`px-2 py-1 text-xs rounded border ${
        active
          ? 'bg-blue-600 text-white border-blue-600'
          : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'
      } ${disabled ? 'opacity-40 cursor-not-allowed' : ''}`}
    >
      {children}
    </button>
  );
}

function Toolbar({ editor }: { editor: Editor }) {
  const chain = () => editor.chain().focus();
  return (
    <div className="flex flex-wrap gap-1 border-b border-gray-200 p-2 bg-gray-50 rounded-t-lg">
      <ToolbarButton title="굵게 (Ctrl+B)" active={editor.isActive('bold')} onClick={() => chain().toggleBold().run()}>
        <b>B</b>
      </ToolbarButton>
      <ToolbarButton title="기울임 (Ctrl+I)" active={editor.isActive('italic')} onClick={() => chain().toggleItalic().run()}>
        <i>I</i>
      </ToolbarButton>
      <ToolbarButton title="취소선" active={editor.isActive('strike')} onClick={() => chain().toggleStrike().run()}>
        <s>S</s>
      </ToolbarButton>
      <span className="w-px bg-gray-200 mx-1" />
      {([1, 2, 3] as const).map((level) => (
        <ToolbarButton
          key={level}
          title={`제목 ${level}`}
          active={editor.isActive('heading', { level })}
          onClick={() => chain().toggleHeading({ level }).run()}
        >
          H{level}
        </ToolbarButton>
      ))}
      <span className="w-px bg-gray-200 mx-1" />
      <ToolbarButton title="글머리 기호" active={editor.isActive('bulletList')} onClick={() => chain().toggleBulletList().run()}>
        • 목록
      </ToolbarButton>
      <ToolbarButton title="번호 매기기" active={editor.isActive('orderedList')} onClick={() => chain().toggleOrderedList().run()}>
        1. 목록
      </ToolbarButton>
      <ToolbarButton title="인용" active={editor.isActive('blockquote')} onClick={() => chain().toggleBlockquote().run()}>
        ❝
      </ToolbarButton>
      <span className="w-px bg-gray-200 mx-1" />
      <ToolbarButton title="코드 블록" active={editor.isActive('codeBlock')} onClick={() => chain().toggleCodeBlock().run()}>
        {'</>'}
      </ToolbarButton>
      <ToolbarButton
        title="Mermaid 다이어그램 블록 삽입"
        onClick={() => chain().setCodeBlock({ language: 'mermaid' }).run()}
      >
        다이어그램
      </ToolbarButton>
      <ToolbarButton title="구분선" onClick={() => chain().setHorizontalRule().run()}>
        ―
      </ToolbarButton>
      <span className="w-px bg-gray-200 mx-1" />
      <ToolbarButton title="실행 취소 (Ctrl+Z)" disabled={!editor.can().undo()} onClick={() => chain().undo().run()}>
        ↶
      </ToolbarButton>
      <ToolbarButton title="다시 실행 (Ctrl+Shift+Z)" disabled={!editor.can().redo()} onClick={() => chain().redo().run()}>
        ↷
      </ToolbarButton>
    </div>
  );
}

/** TipTap WYSIWYG 에디터 (ASPICE 문서 작성용) */
export default function RichTextEditor({ value, onChange, editable = true }: Props) {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        codeBlock: false,
        heading: { levels: [1, 2, 3, 4] },
      }),
      CodeBlockLowlight.configure({ lowlight }),
    ],
    content: value || { type: 'doc', content: [{ type: 'paragraph' }] },
    editable,
    editorProps: {
      attributes: {
        class: 'jir-editor focus:outline-none min-h-[320px] p-4',
      },
    },
    onUpdate: ({ editor }) => {
      onChange?.(editor.getJSON(), editor.getHTML(), editor.getText());
    },
  });

  // 외부에서 값이 바뀌면 (다른 페이지로 이동 등) 반영
  useEffect(() => {
    if (!editor) return;
    const current = JSON.stringify(editor.getJSON());
    const next = JSON.stringify(value || {});
    if (value && current !== next) {
      editor.commands.setContent(value, false);
    }
  }, [editor, value]);

  useEffect(() => {
    editor?.setEditable(editable);
  }, [editor, editable]);

  if (!editor) return <div className="p-4 text-gray-400 text-sm">에디터 로딩 중…</div>;

  return (
    <div className={`border border-gray-200 rounded-lg bg-white${editable ? '' : ' jir-readonly'}`}>
      {editable && <Toolbar editor={editor} />}
      <EditorContent editor={editor} />
    </div>
  );
}
