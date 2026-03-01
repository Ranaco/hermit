import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useCreateShare } from "@/hooks/use-shares";
import { useKeys } from "@/hooks/use-keys";
import { useSecrets } from "@/hooks/use-secrets";
import { useOrganizationStore } from "@/store/organization.store";
import { Copy, Link, Lock, Timer, Type, Vault, FileText, CheckCircle2 } from "lucide-react";

interface CreateShareModalProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CreateShareModal({ isOpen, onOpenChange }: CreateShareModalProps) {
  const { currentVault } = useOrganizationStore();
  const { data: keys } = useKeys(currentVault?.id);
  const { data: secretsData } = useSecrets(currentVault?.id);
  
  const [tab, setTab] = useState<"text" | "vault">("text");
  const [value, setValue] = useState("");
  const [secretId, setSecretId] = useState("");
  const [keyId, setKeyId] = useState("");
  const [passphrase, setPassphrase] = useState("");
  const [expiresInHours, setExpiresInHours] = useState(24);
  const [note, setNote] = useState("");

  const [createdUrl, setCreatedUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const { mutate: createShare, isPending } = useCreateShare();

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    createShare(
      {
        keyId,
        value: tab === "text" ? value : undefined,
        secretId: tab === "vault" ? secretId : undefined,
        passphrase: passphrase || undefined,
        expiresInHours,
        note: note || undefined,
      },
      {
        onSuccess: (data: any) => {
          const url = `${window.location.origin}/share/${data.data.token}`;
          setCreatedUrl(url);
        }
      }
    );
  };

  const copyToClipboard = () => {
    if (createdUrl) {
      navigator.clipboard.writeText(createdUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleReset = () => {
    setCreatedUrl(null);
    setValue("");
    setSecretId("");
    setPassphrase("");
    setExpiresInHours(24);
    setNote("");
  };

  return (
    <Dialog 
      open={isOpen} 
      onOpenChange={(open) => {
        if (!open) handleReset();
        onOpenChange(open);
      }}
    >
      <DialogContent className="sm:max-w-[500px] border-border/80 bg-background/95 backdrop-blur-xl shadow-2xl p-0 overflow-hidden rounded-2xl">
        <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/5 to-purple-500/5 pointer-events-none" />
        
        {createdUrl ? (
          <div className="p-8 text-center flex flex-col items-center justify-center space-y-6 relative z-10">
            <div className="w-16 h-16 bg-emerald-500/10 text-emerald-500 rounded-full flex items-center justify-center mb-2 shadow-[0_0_30px_rgba(16,185,129,0.2)]">
              <CheckCircle2 className="w-8 h-8" />
            </div>
            <div>
              <h2 className="text-xl font-bold tracking-tight mb-2">Secure Link Created!</h2>
              <p className="text-sm text-muted-foreground max-w-[300px] mx-auto">
                Anyone with this link can view the secret {passphrase && "if they have the passphrase " }until it expires or is viewed once.
              </p>
            </div>
            
            <div className="flex w-full items-center space-x-2 bg-black/40 border border-white/10 p-2 rounded-xl">
              <Input
                readOnly
                value={createdUrl}
                className="flex-1 border-0 bg-transparent focus-visible:ring-0 px-2 font-mono text-xs text-white"
              />
              <Button size="icon" className="shrink-0 rounded-lg hover:scale-105 transition-transform" onClick={copyToClipboard}>
                {copied ? <CheckCircle2 className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              </Button>
            </div>
            
            <div className="w-full pt-4">
               <Button variant="outline" className="w-full rounded-xl" onClick={() => onOpenChange(false)}>
                 Close
               </Button>
            </div>
          </div>
        ) : (
          <div className="p-6 relative z-10">
            <DialogHeader className="mb-6">
              <DialogTitle className="text-2xl font-bold flex items-center gap-2">
                <Link className="h-5 w-5 text-indigo-500" />
                Create One-Time Share
              </DialogTitle>
              <DialogDescription>
                Share secrets securely. The link will self-destruct after being viewed once, or when it expires.
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={handleCreate} className="space-y-6">
              {/* Custom Segmented Control */}
              <div className="flex p-1 bg-secondary/50 rounded-xl border border-border/50">
                <button
                  type="button"
                  onClick={() => setTab("text")}
                  className={`flex-1 py-2 px-3 text-sm font-medium rounded-lg flex items-center justify-center gap-2 transition-all ${
                    tab === "text" ? "bg-background shadow text-foreground" : "text-muted-foreground hover:text-foreground hover:bg-background/20"
                  }`}
                >
                  <Type className="w-4 h-4" />
                  Custom Text
                </button>
                <button
                  type="button"
                  onClick={() => setTab("vault")}
                  className={`flex-1 py-2 px-3 text-sm font-medium rounded-lg flex items-center justify-center gap-2 transition-all ${
                    tab === "vault" ? "bg-background shadow text-foreground" : "text-muted-foreground hover:text-foreground hover:bg-background/20"
                  }`}
                >
                  <Vault className="w-4 h-4" />
                  From Vault
                </button>
              </div>

              {/* Payload Section */}
              <div className="p-4 rounded-xl bg-secondary/30 border border-border/40 space-y-4">
                {tab === "text" ? (
                  <div className="space-y-3">
                    <Label className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">Secret Value</Label>
                    <div className="relative">
                      <FileText className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                      <Textarea 
                        required
                        value={value}
                        onChange={(e) => setValue(e.target.value)}
                        placeholder="Enter super secret text..."
                        className="pl-10 min-h-[100px] rounded-xl focus:ring-indigo-500/20 resize-none font-mono text-sm"
                      />
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <Label className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">Select Vault Secret</Label>
                    <select
                      required
                      value={secretId}
                      onChange={(e) => setSecretId(e.target.value)}
                      className="w-full h-10 rounded-xl border border-border bg-card px-3 text-sm focus:ring-2 focus:ring-indigo-500/20 outline-none"
                    >
                      <option value="" disabled>Select a secret...</option>
                      {secretsData?.secrets?.map((s: any) => (
                        <option key={s.id} value={s.id}>{s.name} (v{s.currentVersion?.versionNumber})</option>
                      ))}
                    </select>
                  </div>
                )}
              </div>

              {/* Settings Section */}
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-xs text-muted-foreground uppercase font-semibold">Encryption Key</Label>
                    <select
                      required
                      value={keyId}
                      onChange={(e) => setKeyId(e.target.value)}
                      className="w-full h-10 rounded-xl border border-border bg-background px-3 text-sm focus:ring-2 focus:ring-indigo-500/20 outline-none"
                    >
                      <option value="" disabled>Select Key...</option>
                      {keys?.map((k) => (
                        <option key={k.id} value={k.id}>{k.name}</option>
                      ))}
                    </select>
                  </div>
                  
                  <div className="space-y-2">
                    <Label className="text-xs text-muted-foreground uppercase font-semibold flex items-center gap-1">
                      <Timer className="w-3 h-3" /> Expiration
                    </Label>
                    <select
                      value={expiresInHours}
                      onChange={(e) => setExpiresInHours(Number(e.target.value))}
                      className="w-full h-10 rounded-xl border border-border bg-background px-3 text-sm focus:ring-2 focus:ring-indigo-500/20 outline-none"
                    >
                      <option value={1}>1 Hour</option>
                      <option value={24}>24 Hours</option>
                      <option value={72}>3 Days</option>
                      <option value={168}>1 Week</option>
                    </select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground uppercase font-semibold flex items-center gap-1">
                    <Lock className="w-3 h-3" /> Passphrase (Optional)
                  </Label>
                  <Input 
                    type="password"
                    placeholder="Require a passphrase to open"
                    value={passphrase}
                    onChange={(e) => setPassphrase(e.target.value)}
                    className="rounded-xl"
                  />
                </div>
              </div>

              <div className="pt-2">
                <Button 
                  type="submit" 
                  className="w-full rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-medium hover:scale-[1.02] transition-transform shadow-lg shadow-indigo-500/20"
                  disabled={isPending || (!value && tab === 'text') || (!secretId && tab === 'vault') || !keyId}
                >
                  {isPending ? "Generating..." : "Generate Secure Link"}
                </Button>
              </div>
            </form>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
