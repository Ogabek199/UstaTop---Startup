"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, MessageSquarePlus } from "lucide-react";
import { useRequireAuth } from "@/hooks/use-require-auth";
import { useI18n } from "@/i18n/provider";
import { submitSuggestion } from "@/lib/report";
import { Card, CardBody } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PageContainer } from "@/components/page-container";

export default function SuggestionPage() {
  const { isReady, isAuthenticated } = useRequireAuth();
  const router = useRouter();
  const { t } = useI18n();

  const [suggestion, setSuggestion] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const handleSubmit = async () => {
    const text = suggestion.trim();
    if (text.length < 3) return;

    setLoading(true);
    setError("");
    setSuccess("");
    try {
      await submitSuggestion({ message: text });
      setSuggestion("");
      setSuccess(t.suggestionSuccess);
    } catch {
      setError(t.suggestionError);
    } finally {
      setLoading(false);
    }
  };

  if (!isReady || !isAuthenticated) return null;

  return (
    <div className="min-h-screen pb-nav bg-background">
      <div className="sticky top-0 z-40 bg-background/95 backdrop-blur border-b border-border">
        <PageContainer className="flex items-center gap-3 py-4">
          <button
            type="button"
            onClick={() => router.push("/profile")}
            className="text-primary"
            aria-label={t.back}
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <h1 className="text-lg font-bold text-primary">{t.suggestion}</h1>
        </PageContainer>
      </div>

      <PageContainer className="space-y-4 py-4">
        <Card className="shadow-md">
          <CardBody className="space-y-3">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-accent-soft text-accent">
                <MessageSquarePlus className="h-5 w-5" />
              </div>
              <p className="text-sm text-muted pt-2">{t.suggestionDesc}</p>
            </div>
            <textarea
              value={suggestion}
              onChange={(e) => {
                setSuggestion(e.target.value);
                setSuccess("");
                setError("");
              }}
              placeholder={t.suggestionPlaceholder}
              rows={5}
              maxLength={4000}
              className="w-full resize-none rounded-xl border border-border bg-white px-3 py-2.5 text-sm text-primary outline-none focus:border-accent"
            />
            {error && <p className="text-sm text-error">{error}</p>}
            {success && <p className="text-sm text-success">{success}</p>}
            <Button
              className="w-full"
              disabled={loading || suggestion.trim().length < 3}
              onClick={handleSubmit}
            >
              {loading ? t.suggestionSending : t.suggestionSend}
            </Button>
          </CardBody>
        </Card>
      </PageContainer>
    </div>
  );
}
