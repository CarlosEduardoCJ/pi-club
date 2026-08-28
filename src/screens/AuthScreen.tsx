import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { motion } from 'framer-motion';
import { BookOpen, Eye, EyeOff, Check, ChevronsUpDown } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { cn } from '@/lib/utils';
import { checkRateLimit } from "@/lib/rateLimit";

const AuthScreen = () => {
  const [schools, setSchools] = useState<{ id: string; name: string }[]>([]);
  const [schoolId, setSchoolId] = useState<string>('');
  const [schoolOpen, setSchoolOpen] = useState(false);

  useEffect(() => {
    supabase.from('schools').select('id, name').order('name').then(({ data }) => {
      if (data) setSchools(data);
    });
  }, []);

  const selectedSchool = schools.find((s) => s.id === schoolId);
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [username, setUsername] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const ALLOWED_DOMAINS = ['@aluno.edu.pi.gov.br', '@professor.edu.pi.gov.br'];
  const isInstitutionalEmail = (value: string) =>
    ALLOWED_DOMAINS.some((d) => value.toLowerCase().endsWith(d));

  const getPasswordStrength = (pw: string): 0 | 1 | 2 | 3 => {
    if (!pw) return 0;
    let score = 0;
    if (pw.length >= 8) score++;
    if (/[A-Z]/.test(pw) && /[a-z]/.test(pw)) score++;
    if (/\d/.test(pw)) score++;
    if (/[^A-Za-z0-9]/.test(pw)) score++;
    if (pw.length >= 12) score++;
    if (score <= 2) return 1;
    if (score <= 3) return 2;
    return 3;
  };
  const strength = getPasswordStrength(password);
  const strengthInfo: Record<1 | 2 | 3, { text: string; color: string }> = {
    1: { text: 'Senha muito fraca, tente outra.', color: 'text-destructive' },
    2: { text: 'Senha razoável, mas pode ser mais forte.', color: 'text-yellow-600 dark:text-yellow-500' },
    3: { text: 'Senha forte!', color: 'text-green-600 dark:text-green-500' },
  };

  const handleForgotPassword = async () => {
    if (!email.trim()) {
      toast.error('Digite seu e-mail institucional para receber o link.');
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    setLoading(false);
    if (error) {
      toast.error(error.message || 'Erro ao enviar link de redefinição');
      return;
    }
    toast.success('Enviamos um link de redefinição para seu e-mail.');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (!(await checkRateLimit("auth"))) {
        setLoading(false);
        return;
      }

      if (isLogin) {
        const { data, error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) {
          const msg = (error.message || '').toLowerCase();
          if (msg.includes('banned') || msg.includes('user is banned') || (error as any).code === 'user_banned') {
            throw new Error('Sua conta está suspensa temporariamente por um administrador.');
          }
          throw error;
        }
        if ((data.user?.user_metadata as any)?.banned === true) {
          await supabase.auth.signOut();
          throw new Error('Sua conta está suspensa temporariamente por um administrador.');
        }
        toast.success('Bem-vindo de volta!');
      } else {
        if (!name.trim() || !username.trim()) {
          toast.error('Preencha todos os campos');
          setLoading(false);
          return;
        }
        if (!isInstitutionalEmail(email)) {
          toast.error('Apenas e-mails institucionais da Seduc-PI são permitidos.');
          setLoading(false);
          return;
        }
        if (!selectedSchool) {
          toast.error('Selecione sua escola para criar a conta.');
          setLoading(false);
          return;
        }
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: { name: name.trim(), username: username.trim(), school: selectedSchool.name },
            emailRedirectTo: `${window.location.origin}/`,
          },
        });
        if (error) throw error;
        toast.success('Conta criada! Verifique seu e-mail institucional para confirmar.');
      }
    } catch (err: any) {
      toast.error(err.message || 'Erro na autenticação');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6">
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-sm"
      >
        {/* Logo */}
        <div className="flex flex-col items-center mb-8">
          <div className="w-16 h-16 rounded-2xl bg-primary flex items-center justify-center mb-3">
            <BookOpen className="w-8 h-8 text-primary-foreground" />
          </div>
          <h1 className="text-2xl font-extrabold text-foreground tracking-tight">PI Club</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {isLogin ? 'Entre na sua conta' : 'Crie sua conta de estudante'}
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {!isLogin && (
            <>
              <div className="space-y-2">
                <Label htmlFor="name">Nome completo</Label>
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Ana Beatriz Silva"
                  required={!isLogin}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="username">Nome de usuário</Label>
                <Input
                  id="username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="ana.beatriz"
                  required={!isLogin}
                />
              </div>
              <div className="space-y-2">
                <Label>Escola</Label>
                <Popover open={schoolOpen} onOpenChange={setSchoolOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      type="button"
                      variant="outline"
                      role="combobox"
                      aria-expanded={schoolOpen}
                      className="w-full justify-between font-normal"
                    >
                      <span className={cn(!selectedSchool && 'text-muted-foreground')}>
                        {selectedSchool ? selectedSchool.name : 'Selecione sua escola'}
                      </span>
                      <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
                    <Command>
                      <CommandInput placeholder="Buscar escola..." />
                      <CommandList>
                        <CommandEmpty>Nenhuma escola encontrada.</CommandEmpty>
                        <CommandGroup>
                          {schools.map((s) => (
                            <CommandItem
                              key={s.id}
                              value={s.name}
                              onSelect={() => {
                                setSchoolId(s.id);
                                setSchoolOpen(false);
                              }}
                            >
                              <Check className={cn('mr-2 h-4 w-4', schoolId === s.id ? 'opacity-100' : 'opacity-0')} />
                              {s.name}
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
                <p className="text-xs text-muted-foreground">Selecione a escola onde você estuda ou leciona.</p>
              </div>
            </>
          )}

          <div className="space-y-2">
            <Label htmlFor="email">E-mail institucional</Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="seu.nome@aluno.edu.pi.gov.br"
              required
            />
            <p className="text-xs text-muted-foreground">
              Apenas e-mails @aluno.edu.pi.gov.br (alunos) ou @professor.edu.pi.gov.br (professores) são aceitos.
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">Senha</Label>
            <div className="relative">
              <Input
                id="password"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Mínimo 6 caracteres"
                required
                minLength={6}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            {!isLogin && strength > 0 && (
              <p className={`text-xs font-medium ${strengthInfo[strength as 1 | 2 | 3].color}`}>
                {strengthInfo[strength as 1 | 2 | 3].text}
              </p>
            )}
          </div>

          {isLogin && (
            <button
              type="button"
              onClick={handleForgotPassword}
              className="text-xs text-primary font-medium hover:underline self-end ml-auto block"
            >
              Esqueci minha senha
            </button>
          )}

          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? 'Carregando...' : isLogin ? 'Entrar' : 'Criar conta'}
          </Button>
        </form>

        <p className="text-center text-sm text-muted-foreground mt-6">
          {isLogin ? 'Não tem conta?' : 'Já tem conta?'}{' '}
          <button
            onClick={() => setIsLogin(!isLogin)}
            className="text-primary font-semibold hover:underline"
          >
            {isLogin ? 'Cadastre-se' : 'Entrar'}
          </button>
        </p>
      </motion.div>
    </div>
  );
};

export default AuthScreen;
