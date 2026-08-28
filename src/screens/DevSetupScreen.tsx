import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { createClient } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { ShieldCheck } from "lucide-react";

const DEFAULT_DEV_SCHOOL = "CETI MANOEL RICARDO";

const authSetupClient = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
  {
    auth: {
      storageKey: "pi-club-dev-setup",
      persistSession: false,
      autoRefreshToken: false,
    },
  }
);

const verifyMasterPassword = async (password: string) => {
  const { data, error } = await supabase.functions.invoke("dev-master-auth", {
    body: { password },
  });

  if (data?.ok) return true;

  const message =
    (data as { error?: string } | null)?.error ??
    (error ? "Não foi possível validar a senha mestra." : "Senha mestra incorreta.");
  throw new Error(message);
};


const getDeveloperIdentity = (email: string) => {
  const localPart = email.trim().split("@")[0] || "developer";
  const username = email
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ".")
    .replace(/^\.+|\.+$/g, "");

  return {
    name: localPart,
    username: username || `developer.${Date.now()}`,
  };
};

export default function DevSetupScreen() {
  const navigate = useNavigate();
  const [step, setStep] = useState<"master" | "form">("master");
  const [masterPassword, setMasterPassword] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleMasterStep = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      await verifyMasterPassword(masterPassword);


      setStep("form");
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      await verifyMasterPassword(masterPassword);


      const identity = getDeveloperIdentity(email);
      const { data, error } = await authSetupClient.auth.signUp({
        email: email.trim(),
        password,
        options: {
          data: {
            name: identity.name,
            username: identity.username,
            school: DEFAULT_DEV_SCHOOL,
            developer: true,
            is_developer: true,
          },
          emailRedirectTo: `${window.location.origin}/dev-login`,
        },
      });

      if (error) throw error;
      if (!data.user) throw new Error("Não foi possível criar a conta desenvolvedor.");

      toast.success("Conta desenvolvedor criada. Verifique seu e-mail para concluir o acesso.");
      navigate("/dev-login", { replace: true });
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-sm">
        <CardHeader className="text-center">
          <div className="mx-auto w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-2">
            <ShieldCheck className="w-6 h-6 text-primary" />
          </div>
          <CardTitle>Configurar Desenvolvedor</CardTitle>
        </CardHeader>
        <CardContent>
          {step === "master" ? (
            <form onSubmit={handleMasterStep} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="master">Senha mestra</Label>
                <Input id="master" type="password" value={masterPassword} onChange={(e) => setMasterPassword(e.target.value)} required autoFocus />
              </div>
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? "Validando..." : "Continuar"}
              </Button>
            </form>
          ) : (
            <form onSubmit={handleCreate} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Senha (mín. 8)</Label>
                <Input id="password" type="password" minLength={8} value={password} onChange={(e) => setPassword(e.target.value)} required />
              </div>
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? "Criando..." : "Criar conta desenvolvedor"}
              </Button>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
