import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, waitFor, cleanup } from '@testing-library/react';
import PostCard from '@/components/PostCard';

const mocks = vi.hoisted(() => ({
  update: vi.fn(), delete: vi.fn(), from: vi.fn(),
  invalidateQueries: vi.fn(), success: vi.fn(), error: vi.fn(),
}));

vi.mock('@/hooks/useAuth', () => ({ useAuth: () => ({ profileId: 'author' }) }));
vi.mock('react-router-dom', () => ({ useNavigate: () => vi.fn() }));
vi.mock('@tanstack/react-query', () => ({ useQueryClient: () => mocks }));
vi.mock('@/integrations/supabase/client', () => ({ supabase: { from: mocks.from } }));
vi.mock('sonner', () => ({ toast: { success: mocks.success, error: mocks.error } }));
vi.mock('@/components/CommentsSection', () => ({ default: () => null }));
vi.mock('@/components/ProfileAvatar', () => ({ default: () => null }));
vi.mock('@/components/ReportDialog', () => ({ default: () => null }));
vi.mock('framer-motion', () => ({ motion: { div: ({ children }: any) => <div>{children}</div> } }));
vi.mock('@/components/ui/dropdown-menu', () => ({
  DropdownMenu: ({ children }: any) => <div>{children}</div>,
  DropdownMenuTrigger: ({ children }: any) => <div>{children}</div>,
  DropdownMenuContent: ({ children }: any) => <div>{children}</div>,
  DropdownMenuItem: ({ children, onSelect }: any) => <button onClick={onSelect}>{children}</button>,
}));

const post = {
  id: 'post-1', authorId: 'author', authorName: 'Autor', authorUsername: 'autor',
  authorAvatar: '', clubName: 'Clube', content: 'Publicação de teste',
  likesCount: 0, commentsCount: 0, createdAt: '2026-10-18T12:00:00Z',
};
const result = (value: unknown) => ({ eq: vi.fn().mockResolvedValue(value) });
const deletePost = () => {
  const view = render(<PostCard post={post} index={0} />);
  fireEvent.click(view.getByText('Apagar post'));
};

describe('exclusão de publicação', () => {
  beforeEach(() => {
    cleanup();
    vi.clearAllMocks();
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    vi.spyOn(console, 'error').mockImplementation(() => {});
    mocks.from.mockImplementation((table: string) => table === 'posts'
      ? { update: mocks.update, delete: mocks.delete }
      : { select: () => ({ eq: () => ({ eq: () => ({ maybeSingle: () => Promise.resolve({ data: null }) }) }) }) });
  });

  it('exclui definitivamente sem update nem select e atualiza todas as listas', async () => {
    const deletion = result({ count: 1, error: null });
    mocks.delete.mockReturnValue(deletion);
    deletePost();
    await waitFor(() => expect(mocks.invalidateQueries).toHaveBeenCalledTimes(4));
    expect(mocks.delete).toHaveBeenCalledWith({ count: 'exact' });
    expect(deletion.eq).toHaveBeenCalledWith('id', post.id);
    expect(mocks.update).not.toHaveBeenCalled();
    for (const key of ['posts', 'posts-infinite', 'user-posts', 'profile']) {
      expect(mocks.invalidateQueries).toHaveBeenCalledWith({ queryKey: [key] });
    }
    expect(mocks.success).toHaveBeenCalledTimes(1);
  });

  it('expõe o erro real de exclusão sem informar sucesso', async () => {
    const error = { message: 'new row violates row-level security policy for table posts' };
    mocks.delete.mockReturnValue(result({ count: null, error }));
    deletePost();
    await waitFor(() => expect(mocks.error).toHaveBeenCalled());
    expect(console.error).toHaveBeenCalledWith('[PostCard] delete falhou:', error);
    expect(mocks.error).toHaveBeenCalledWith(`Erro ao apagar: ${error.message}`);
    expect(mocks.success).not.toHaveBeenCalled();
    expect(mocks.update).not.toHaveBeenCalled();
    expect(mocks.invalidateQueries).not.toHaveBeenCalled();
  });

  it('não informa sucesso quando nenhuma linha é excluída', async () => {
    mocks.delete.mockReturnValue(result({ count: 0, error: null }));
    deletePost();
    await waitFor(() => expect(mocks.error).toHaveBeenCalled());
    expect(console.error).toHaveBeenCalledWith('[PostCard] delete não afetou linhas:', { postId: post.id, count: 0 });
    expect(mocks.success).not.toHaveBeenCalled();
    expect(mocks.invalidateQueries).not.toHaveBeenCalled();
  });

  it('não exclui se o autor cancela a confirmação', () => {
    vi.mocked(window.confirm).mockReturnValue(false);
    deletePost();
    expect(mocks.delete).not.toHaveBeenCalled();
    expect(mocks.update).not.toHaveBeenCalled();
    expect(mocks.invalidateQueries).not.toHaveBeenCalled();
  });
});