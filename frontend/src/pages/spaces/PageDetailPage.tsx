import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import apiClient from '../../services/api.client';
import { downloadFile } from '../../services/download';
import RichTextEditor from '../../components/RichTextEditor';
import { ConfirmDialog } from '../../components/Modal';
import Mermaid from '../../components/Mermaid';

interface VersionRow {
  id: string;
  version: number;
  title: string;
  changeSummary?: string | null;
  changedById?: string | null;
  createdAt: string;
}

interface CommentRow {
  id: string;
  body: string;
  createdAt: string;
}

interface PageDetail {
  id: string;
  key: string;
  title: string;
  status: string;
  version: number;
  body?: unknown;
  bodyText?: string | null;
  createdAt: string;
  updatedAt: string;
  versions: VersionRow[];
  comments: CommentRow[];
}

/** TipTap JSON에서 mermaid 코드 블록만 수집 */
function collectMermaid(node: unknown, acc: string[] = []): string[] {
  if (!node || typeof node !== 'object') return acc;
  const n = node as {
    type?: string;
    attrs?: { language?: string };
    content?: unknown[];
    text?: string;
  };
  if (n.type === 'codeBlock' && n.attrs?.language === 'mermaid') {
    const text = (n.content ?? [])
      .map((child) => (child as { text?: string }).text ?? '')
      .join('');
    if (text.trim()) acc.push(text);
  }
  for (const child of n.content ?? []) collectMermaid(child, acc);
  return acc;
}

export default function PageDetailPage() {
  const { spaceKey, pageId } = useParams<{ spaceKey: string; pageId: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState('');
  const [body, setBody] = useState<unknown>(null);
  const [bodyText, setBodyText] = useState('');
  const [changeSummary, setChangeSummary] = useState('');
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [exporting, setExporting] = useState<string | null>(null);

  const { data: page, isLoading } = useQuery({
    queryKey: ['page', pageId],
    queryFn: async () => {
      const res = await apiClient.get(`/api/spaces/${spaceKey}/docs/${pageId}`);
      return res.data as PageDetail;
    },
    enabled: !!pageId,
  });

  useEffect(() => {
    if (!page) return;
    setTitle(page.title ?? '');
    setBody(page.body ?? null);
    setBodyText(page.bodyText ?? '');
    setChangeSummary('');
    setEditing(false);
  }, [page?.id, page?.version]);

  const savePage = useMutation({
    mutationFn: async () => {
      const res = await apiClient.put(`/api/spaces/${spaceKey}/docs/${pageId}`, {
        title: title.trim(),
        body,
        bodyText,
        changeSummary: changeSummary.trim() || undefined,
      });
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['page', pageId] });
      queryClient.invalidateQueries({ queryKey: ['docs', spaceKey] });
      setEditing(false);
      toast.success('문서를 저장했습니다. 새 버전이 기록되었습니다.');
    },
    onError: () => toast.error('저장하지 못했습니다. 잠시 후 다시 시도해 주세요.'),
  });

  const deletePage = useMutation({
    mutationFn: async () => {
      await apiClient.delete(`/api/spaces/${spaceKey}/docs/${pageId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['docs', spaceKey] });
      toast.success('문서를 삭제했습니다.');
      navigate(`/spaces/${spaceKey}/docs`);
    },
    onError: () => toast.error('삭제하지 못했습니다.'),
  });

  const mermaidBlocks = useMemo(() => collectMermaid(body), [body]);

  // 본문 JSON이 없는 기존 문서(bodyText만 존재)도 편집 가능하도록 변환
  const editorValue = useMemo(() => {
    if (body) return body;
    const text = bodyText.trim();
    if (!text) return null;
    return {
      type: 'doc',
      content: text.split(/\r?\n/).map((line) => ({
        type: 'paragraph',
        content: line ? [{ type: 'text', text: line }] : [],
      })),
    };
  }, [body, bodyText]);

  const handleSave = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!title.trim()) {
      toast.error('제목을 입력해 주세요.');
      return;
    }
    savePage.mutate();
  };

  const handleExport = async (format: 'pdf' | 'docx' | 'html') => {
    if (!page) return;
    setExporting(format);
    try {
      await downloadFile(
        `/api/export/documents/${page.id}/${format}`,
        `${page.key}-v${page.version}.${format}`,
      );
      toast.success('내보내기를 시작했습니다.');
    } catch {
      toast.error('내보내기에 실패했습니다.');
    } finally {
      setExporting(null);
    }
  };

  if (isLoading) return <p role="status">Loading...</p>;
  if (!page) {
    return (
      <div className="bg-white rounded-lg shadow p-8 text-center">
        <h1 className="text-xl font-bold mb-2">문서를 찾을 수 없습니다</h1>
        <Link to={`/spaces/${spaceKey}/docs`} className="text-blue-600 hover:underline">
          문서 목록으로 →
        </Link>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <nav aria-label="경로" className="text-sm text-gray-500">
        <Link to={`/spaces/${spaceKey}/docs`} className="hover:underline">
          Documents
        </Link>{' '}
        / <span aria-current="page">{page.key}</span>
      </nav>

      <article className="bg-white rounded-lg shadow">
        <header className="flex flex-wrap justify-between items-start gap-3 p-6 border-b border-gray-100">
          <div className="min-w-0">
            {editing ? (
              <form onSubmit={handleSave} noValidate id="page-form">
                <div className="field" style={{ marginBlockEnd: 0 }}>
                  <label htmlFor="page-title">제목</label>
                  <input
                    id="page-title"
                    type="text"
                    required
                    maxLength={200}
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                  />
                </div>
              </form>
            ) : (
              <>
                <p className="text-sm text-gray-500">
                  {page.key} · 버전 {page.version}
                </p>
                <h1 className="text-2xl font-bold break-words">{page.title}</h1>
              </>
            )}
          </div>
          <div className="flex flex-wrap gap-2">
            {editing ? (
              <>
                <button
                  type="submit"
                  form="page-form"
                  className="btn btn-primary btn-sm"
                  disabled={savePage.isPending}
                >
                  {savePage.isPending ? '저장 중…' : '저장'}
                </button>
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={() => {
                    setEditing(false);
                    setTitle(page.title);
                    setBody(page.body ?? null);
                    setBodyText(page.bodyText ?? '');
                    setChangeSummary('');
                  }}
                >
                  취소
                </button>
              </>
            ) : (
              <button type="button" className="btn btn-primary btn-sm" onClick={() => setEditing(true)}>
                편집
              </button>
            )}
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={() => setConfirmOpen(true)}
            >
              삭제
            </button>
          </div>
        </header>

        <section className="p-6" aria-label="문서 본문">
          {editing ? (
            <>
              <RichTextEditor value={editorValue} onChange={(json, _html, text) => {
                setBody(json);
                setBodyText(text);
              }} />
              <div className="field mt-4">
                <label htmlFor="change-summary">변경 요약</label>
                <input
                  id="change-summary"
                  type="text"
                  maxLength={500}
                  placeholder="예: 3.2절 인터페이스 요구사항 추가"
                  value={changeSummary}
                  onChange={(e) => setChangeSummary(e.target.value)}
                />
                <span className="hint">버전 이력에 기록됩니다.</span>
              </div>
            </>
          ) : body ? (
            <RichTextEditor value={body} editable={false} />
          ) : bodyText.trim() ? (
            <div className="jir-content" style={{ whiteSpace: 'pre-wrap' }}>
              {bodyText}
            </div>
          ) : (
            <p className="text-sm text-gray-400">
              내용이 없습니다. “편집”을 눌러 작성을 시작하세요.
            </p>
          )}
        </section>

        {!editing && mermaidBlocks.length > 0 && (
          <section className="px-6 pb-6" aria-labelledby="diagrams-heading">
            <h2 id="diagrams-heading" className="text-lg font-semibold mb-3">
              다이어그램
            </h2>
            <div className="flex flex-col gap-3">
              {mermaidBlocks.map((code, index) => (
                <Mermaid key={`${index}-${code.slice(0, 24)}`} code={code} />
              ))}
            </div>
          </section>
        )}

        <footer className="px-6 py-4 border-t border-gray-100 flex flex-wrap items-center gap-3 text-sm text-gray-500">
          <span>
            버전 {page.version} · 최종 수정 {new Date(page.updatedAt).toLocaleString('ko-KR')}
          </span>
          <span className="flex-1" />
          <span id="export-label">내보내기</span>
          {(['pdf', 'docx', 'html'] as const).map((format) => (
            <button
              key={format}
              type="button"
              className="btn btn-secondary btn-sm"
              aria-describedby="export-label"
              disabled={exporting === format}
              onClick={() => handleExport(format)}
            >
              {exporting === format ? '…' : format.toUpperCase()}
            </button>
          ))}
        </footer>
      </article>

      <section className="bg-white rounded-lg shadow p-6" aria-labelledby="versions-heading">
        <h2 id="versions-heading" className="text-lg font-semibold mb-3">
          버전 이력
        </h2>
        {page.versions?.length ? (
          <ol className="version-list">
            {page.versions.slice(0, 10).map((v) => (
              <li key={v.id}>
                <span className="font-mono text-xs text-blue-600">v{v.version}</span>
                <span className="text-sm">{v.title}</span>
                {v.changeSummary && <span className="text-sm text-gray-500"> — {v.changeSummary}</span>}
                <time className="text-xs text-gray-400" dateTime={v.createdAt}>
                  {new Date(v.createdAt).toLocaleString('ko-KR')}
                </time>
              </li>
            ))}
          </ol>
        ) : (
          <p className="text-sm text-gray-500">버전 이력이 없습니다.</p>
        )}
      </section>

      {page.comments?.length > 0 && (
        <section className="bg-white rounded-lg shadow p-6" aria-labelledby="comments-heading">
          <h2 id="comments-heading" className="text-lg font-semibold mb-3">
            댓글
          </h2>
          <ul className="space-y-3" style={{ listStyle: 'none', padding: 0 }}>
            {page.comments.map((c) => (
              <li key={c.id} className="bg-slate-50 rounded-lg p-3">
                <p className="text-xs text-gray-500 mb-1">
                  {new Date(c.createdAt).toLocaleString('ko-KR')}
                </p>
                <p className="text-sm whitespace-pre-wrap">{c.body}</p>
              </li>
            ))}
          </ul>
        </section>
      )}

      <ConfirmDialog
        open={confirmOpen}
        title="문서 삭제"
        message={`“${page.title}” 문서를 삭제할까요? 이 작업은 되돌릴 수 없습니다.`}
        confirmLabel="삭제"
        onConfirm={() => deletePage.mutate()}
        onCancel={() => setConfirmOpen(false)}
      />
    </div>
  );
}
