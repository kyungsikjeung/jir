import { useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import apiClient from '../../services/api.client';
import Modal from '../../components/Modal';

interface DocNode {
  id: string;
  key: string;
  title: string;
  status: string;
  version: number;
  updatedAt: string;
  parentPageId: string | null;
  position: number;
  isHomepage: boolean;
  children: DocNode[];
}

/** 트리 전체를 평탄화 (부모 선택 옵션용) */
function flatten(nodes: DocNode[], depth = 0): Array<{ node: DocNode; depth: number }> {
  return nodes.flatMap((node) => [
    { node, depth },
    ...flatten(node.children ?? [], depth + 1),
  ]);
}

function filterTree(nodes: DocNode[], query: string): DocNode[] {
  const q = query.trim().toLowerCase();
  if (!q) return nodes;
  const walk = (node: DocNode): DocNode | null => {
    const children = (node.children ?? []).map(walk).filter((n): n is DocNode => !!n);
    const selfMatch =
      node.title.toLowerCase().includes(q) || node.key.toLowerCase().includes(q);
    if (!selfMatch && children.length === 0) return null;
    return { ...node, children };
  };
  return nodes.map(walk).filter((n): n is DocNode => !!n);
}

function DocTreeItem({
  node,
  spaceKey,
  defaultOpen,
}: {
  node: DocNode;
  spaceKey: string;
  defaultOpen: boolean;
}) {
  const children = node.children ?? [];
  const link = (
    <Link
      to={`/spaces/${spaceKey}/docs/${node.id}`}
      className="doc-link"
      title={`${node.key} · ${node.title}`}
    >
      <span className="doc-title">{node.title}</span>
      <span className="doc-meta">
        {node.key} · v{node.version}
      </span>
    </Link>
  );

  if (children.length === 0) {
    return <li className="doc-row">{link}</li>;
  }

  return (
    <li>
      <details className="tree" open={defaultOpen}>
        <summary>{link}</summary>
        <ul className="doc-children">
          {children.map((child) => (
            <DocTreeItem key={child.id} node={child} spaceKey={spaceKey} defaultOpen={defaultOpen} />
          ))}
        </ul>
      </details>
    </li>
  );
}

export default function DocsTreePage() {
  const { spaceKey } = useParams<{ spaceKey: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [parentId, setParentId] = useState('');

  const { data: pages, isLoading } = useQuery({
    queryKey: ['docs', spaceKey],
    queryFn: async () => {
      const res = await apiClient.get(`/api/spaces/${spaceKey}/docs`);
      return res.data as DocNode[];
    },
  });

  const createPage = useMutation({
    mutationFn: async (payload: { title: string; parentPageId?: string }) => {
      const res = await apiClient.post(`/api/spaces/${spaceKey}/docs`, payload);
      return res.data as { id: string; key: string };
    },
    onSuccess: (page) => {
      queryClient.invalidateQueries({ queryKey: ['docs', spaceKey] });
      setDialogOpen(false);
      setParentId('');
      toast.success(`문서 ${page.key}가 생성되었습니다.`);
      navigate(`/spaces/${spaceKey}/docs/${page.id}`);
    },
    onError: () => toast.error('문서를 생성하지 못했습니다.'),
  });

  const flat = useMemo(() => flatten(pages ?? []), [pages]);
  const filtered = useMemo(() => filterTree(pages ?? [], query), [pages, query]);

  const handleCreate = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = event.currentTarget;
    if (!form.checkValidity()) return;
    const title = (form.elements.namedItem('title') as HTMLInputElement).value.trim();
    if (!title) return;
    createPage.mutate({ title, parentPageId: parentId || undefined });
  };

  return (
    <div>
      <div className="flex flex-wrap justify-between items-center gap-3 mb-6">
        <div>
          <h1 className="text-2xl font-bold">Documents</h1>
          <p className="text-sm text-gray-500 mt-1">
            요구사항 명세, 계획서, 회의록 등 ASPICE 산출물 문서
          </p>
        </div>
        <button type="button" className="btn btn-primary" onClick={() => setDialogOpen(true)}>
          New Page
        </button>
      </div>

      <search className="bg-white rounded-lg shadow p-4 mb-4">
        <form role="search" onSubmit={(e) => e.preventDefault()} className="flex gap-3 items-end">
          <div className="field" style={{ marginBlockEnd: 0, inlineSize: 'min(24rem, 100%)' }}>
            <label htmlFor="doc-search">문서 검색</label>
            <input
              id="doc-search"
              type="search"
              placeholder="제목 또는 키"
              autoComplete="off"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
        </form>
      </search>

      {isLoading ? (
        <p role="status">Loading...</p>
      ) : flat.length === 0 ? (
        <div className="bg-white rounded-lg shadow p-8 text-center">
          <p className="text-gray-500 mb-4">아직 문서가 없습니다.</p>
          <button type="button" className="btn btn-primary" onClick={() => setDialogOpen(true)}>
            첫 페이지 만들기
          </button>
        </div>
      ) : filtered.length === 0 ? (
        <p className="text-gray-500">“{query}”에 해당하는 문서가 없습니다.</p>
      ) : (
        <nav aria-label="문서 트리" className="bg-white rounded-lg shadow p-4">
          <ul className="doc-tree">
            {filtered.map((node) => (
              <DocTreeItem
                key={node.id}
                node={node}
                spaceKey={spaceKey!}
                defaultOpen={query.trim().length > 0}
              />
            ))}
          </ul>
        </nav>
      )}

      <Modal open={dialogOpen} onClose={() => setDialogOpen(false)} title="새 문서">
        <form onSubmit={handleCreate} noValidate>
          <div className="field">
            <label htmlFor="new-page-title">
              제목 <span aria-hidden="true" style={{ color: 'hsl(var(--danger))' }}>*</span>
            </label>
            <input
              id="new-page-title"
              name="title"
              type="text"
              required
              autoFocus
              autoComplete="off"
              maxLength={200}
              placeholder="예: 소프트웨어 요구사항 명세서"
            />
          </div>
          <div className="field">
            <label htmlFor="new-page-parent">상위 문서</label>
            <select
              id="new-page-parent"
              value={parentId}
              onChange={(e) => setParentId(e.target.value)}
            >
              <option value="">(최상위)</option>
              {flat.map(({ node, depth }) => (
                <option key={node.id} value={node.id}>
                  {'　'.repeat(depth)}
                  {node.title}
                </option>
              ))}
            </select>
          </div>
          <div className="flex justify-end gap-2 mt-6">
            <button type="button" className="btn btn-secondary" onClick={() => setDialogOpen(false)}>
              취소
            </button>
            <button type="submit" className="btn btn-primary" disabled={createPage.isPending}>
              {createPage.isPending ? '생성 중…' : '만들기'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
