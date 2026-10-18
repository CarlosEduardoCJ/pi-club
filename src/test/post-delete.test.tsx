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
const result = (value: unknown) => ({ eq: vi.fn(() => ({ select: vi.fn().mockResolvedValue(value) })) });
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

  it('marca a publicação e atualiza todas as listas após sucesso', async () => {
    mocks.update.mockReturnValue(result({ data: [{ id: post.id }], error: null }));
    deletePost();
    await waitFor(() => expect(mocks.invalidateQueries).toHaveBeenCalledTimes(4));
    expect(mocks.update).toHaveBeenCalledWith({ deleted_at: expect.stringMatching(/^\d{4}-\d{2}-\d{2}T/) });
    for (const key of ['posts', 'posts-infinite', 'user-posts', 'profile']) {
      expect(mocks.invalidateQueries).toHaveBeenCalledWith({ queryKey: [key] });
    }
    expect(mocks.delete).not.toHaveBeenCalled();
  });

  it('não tenta exclusão definitiva quando a atualização retorna erro real', async () => {
    const error = { message: 'Falha confirmada no banco' };
    mocks.update.mockReturnValue(result({ data: null, error }));
    deletePost();
    await waitFor(() => expect(mocks.error).toHaveBeenCalled());
    expect(console.error).toHaveBeenCalledWith('[PostCard] soft delete falhou:', error);
    expect(mocks.error.mock.calls[0][0]).toContain(error.message);
    expect(mocks.delete).not.toHaveBeenCalled();
    expect(mocks.invalidateQueries).not.toHaveBeenCalled();
  });

  it('tenta exclusão definitiva somente quando nenhuma linha foi atualizada', async () => {
    mocks.update.mockReturnValue(result({ data: [], error: null }));
    mocks.delete.mockReturnValue(result({ data: [{ id: post.id }], error: null }));
    deletePost();
    await waitFor(() => expect(mocks.invalidateQueries).toHaveBeenCalledTimes(4));
    expect(mocks.delete).toHaveBeenCalledTimes(1);
  });

  it.each([
    { data: [], error: null },
    { data: null, error: { message: 'Acesso negado' } },
  ])('não informa sucesso nem atualiza listas se o fallback falhar: %j', async (fallback) => {
    mocks.update.mockReturnValue(result({ data: [], error: null }));
    mocks.delete.mockReturnValue(result(fallback));
    deletePost();
    await waitFor(() => expect(mocks.error).toHaveBeenCalled());
    expect(mocks.success).not.toHaveBeenCalled();
    expect(mocks.invalidateQueries).not.toHaveBeenCalled();
  });
});