"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Loader2, Clock, MessageSquare, MapPin, Power } from "lucide-react";
import { toast } from "sonner";
import type { AppSettings } from "@/actions/settings";
import { updateSettings } from "@/actions/settings";
import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface SettingsFormProps {
  settings: AppSettings;
}

export function SettingsForm({ settings }: SettingsFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [briefingEnabled, setBriefingEnabled] = useState(settings.briefingEnabled);
  const [whatsappEnabled, setWhatsappEnabled] = useState(settings.whatsappEnabled);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    formData.set("briefingEnabled", String(briefingEnabled));
    formData.set("whatsappEnabled", String(whatsappEnabled));

    startTransition(async () => {
      const result = await updateSettings(formData);
      if (result.error) toast.error(result.error);
      else {
        toast.success("Settings saved");
        router.refresh();
      }
    });
  }

  return (
    <DashboardShell
      title="Settings"
      description="Configure briefing delivery and platform preferences"
    >
      <motion.form
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        onSubmit={handleSubmit}
        className="mx-auto max-w-2xl space-y-6"
      >
        <Card className="border-border/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Power className="h-4 w-4" />
              Briefing Controls
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between rounded-lg border border-border/50 p-4">
              <div>
                <Label>Enable Daily Briefing</Label>
                <p className="text-xs text-muted-foreground">
                  Master switch for automated morning deliveries
                </p>
              </div>
              <Switch checked={briefingEnabled} onCheckedChange={setBriefingEnabled} />
            </div>
            <div className="flex items-center justify-between rounded-lg border border-border/50 p-4">
              <div>
                <Label>WhatsApp Delivery</Label>
                <p className="text-xs text-muted-foreground">
                  Send messages via WhatsApp Business API
                </p>
              </div>
              <Switch checked={whatsappEnabled} onCheckedChange={setWhatsappEnabled} />
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Clock className="h-4 w-4" />
              Schedule
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="cronTime">Delivery Time (IST)</Label>
              <Input
                id="cronTime"
                name="cronTime"
                defaultValue={settings.cronTime}
                placeholder="07:00"
                disabled={isPending}
              />
              <p className="text-xs text-muted-foreground">
                Vercel Cron is configured for 7:00 AM IST (1:30 AM UTC). Update
                vercel.json if you change this.
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <MapPin className="h-4 w-4" />
              Defaults
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <Label htmlFor="defaultCity">Default City</Label>
              <Input
                id="defaultCity"
                name="defaultCity"
                defaultValue={settings.defaultCity}
                disabled={isPending}
              />
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <MessageSquare className="h-4 w-4" />
              API Configuration
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              WhatsApp, weather, gold, and market data API keys are configured
              via environment variables. See .env.example for required variables.
            </p>
          </CardContent>
        </Card>

        <Button type="submit" disabled={isPending}>
          {isPending ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Saving...
            </>
          ) : (
            "Save Settings"
          )}
        </Button>
      </motion.form>
    </DashboardShell>
  );
}