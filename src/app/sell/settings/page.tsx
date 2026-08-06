"use client";

import { useCallback, useEffect, useState } from "react";
import { CheckCircle2, RefreshCw, SatelliteDish, WifiOff } from "lucide-react";
import { usePosOffline } from "@/lib/pos-offline/context";
import {
  getInstalledVersion,
  getLatestVersion,
  versionsMatch,
  type PwaVersionInfo,
} from "@/lib/pos-offline/version-check";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

function formatVersion(info: PwaVersionInfo | null) {
  if (!info) return "—";
  return info.buildId && info.buildId !== "dev" ? `${info.version} (${info.buildId})` : info.version;
}

export default function SellSettingsPage() {
  const { online } = usePosOffline();
  const [installed, setInstalled] = useState<PwaVersionInfo | null>(null);
  const [latest, setLatest] = useState<PwaVersionInfo | null>(null);
  const [checking, setChecking] = useState(false);
  const [checkedAt, setCheckedAt] = useState<Date | null>(null);

  const check = useCallback(async () => {
    setChecking(true);
    try {
      const [installedInfo, latestInfo] = await Promise.all([
        getInstalledVersion(),
        online ? getLatestVersion() : Promise.resolve(null),
      ]);
      setInstalled(installedInfo);
      setLatest(latestInfo);
      setCheckedAt(new Date());
    } finally {
      setChecking(false);
    }
  }, [online]);

  useEffect(() => {
    void check();
  }, [check]);

  const upToDate = versionsMatch(installed, latest);

  return (
    <div className="mx-auto flex w-full max-w-lg flex-col gap-4 px-4 py-6 sm:px-6 lg:px-8">
      <h1 className="text-lg font-semibold tracking-tight">Settings</h1>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium text-zinc-500">App version</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="flex items-center justify-between gap-3">
            <span className="text-sm text-zinc-500">Installed</span>
            <span className="font-mono text-sm">{formatVersion(installed)}</span>
          </div>
          <div className="flex items-center justify-between gap-3">
            <span className="text-sm text-zinc-500">Available online</span>
            <span className="font-mono text-sm">
              {online ? formatVersion(latest) : "—"}
            </span>
          </div>

          <div className="flex items-center gap-2 rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm">
            {!online ? (
              <>
                <WifiOff className="size-4 shrink-0 text-zinc-400" />
                <span className="text-zinc-500">Offline — can&apos;t check for updates.</span>
              </>
            ) : upToDate ? (
              <>
                <CheckCircle2 className="size-4 shrink-0 text-emerald-600" />
                <span className="text-zinc-700">You&apos;re on the latest version.</span>
              </>
            ) : (
              <>
                <SatelliteDish className="size-4 shrink-0 text-sky-600" />
                <span className="text-zinc-700">
                  A newer version is available — it&apos;ll be applied automatically.
                </span>
              </>
            )}
          </div>

          <Button
            type="button"
            variant="outline"
            size="sm"
            className="self-start"
            onClick={() => void check()}
            disabled={checking}
          >
            <RefreshCw className={`mr-1.5 size-3.5 ${checking ? "animate-spin" : ""}`} />
            {checking ? "Checking…" : "Check now"}
          </Button>

          {checkedAt ? (
            <p className="text-xs text-zinc-400">Last checked {checkedAt.toLocaleTimeString()}</p>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}
