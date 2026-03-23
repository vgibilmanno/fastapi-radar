import { apiClient, InflightRequest } from "@/api/client";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { RefreshIntervalSelect } from "@/components/ui/refresh-interval-select";
import { useT } from "@/i18n";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { Loader2, Radio } from "lucide-react";
import { useState } from "react";

const METHOD_COLORS: Record<string, string> = {
  GET: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
  POST: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
  PUT: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
  PATCH: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200",
  DELETE: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
};

function ElapsedBadge({ ms }: { ms: number }) {
  const variant: "destructive" | "secondary" | "outline" =
    ms > 5000 ? "destructive" : ms > 1000 ? "secondary" : "outline";
  return (
    <Badge variant={variant} className="font-mono text-xs">
      {ms < 1000 ? `${ms}ms` : `${(ms / 1000).toFixed(1)}s`}
    </Badge>
  );
}

function InflightRow({ req }: { req: InflightRequest }) {
  const methodColor =
    METHOD_COLORS[req.method] ?? "bg-gray-100 text-gray-800";

  return (
    <div className="flex items-center gap-4 py-3 px-4 border-b last:border-b-0 text-sm">
      <span
        className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-bold shrink-0 ${methodColor}`}
      >
        {req.method}
      </span>
      <span className="font-mono truncate flex-1 min-w-0">{req.path}</span>
      {req.host && (
        <span className="text-xs font-mono bg-muted px-1.5 py-0.5 rounded shrink-0 hidden sm:block">
          {req.host}
        </span>
      )}
      <span className="text-muted-foreground shrink-0 w-32 text-right hidden md:block">
        {req.client_ip ?? "—"}
      </span>
      <span className="text-muted-foreground shrink-0 w-24 text-right hidden lg:block">
        {format(new Date(req.started_at), "HH:mm:ss.SSS")}
      </span>
      <span className="shrink-0">
        <ElapsedBadge ms={req.elapsed_ms} />
      </span>
      <span className="font-mono text-xs text-muted-foreground shrink-0 w-20 truncate hidden xl:block">
        {req.request_id.slice(0, 8)}
      </span>
    </div>
  );
}

export function InflightPage() {
  const t = useT();
  const [refetchInterval, setRefetchInterval] = useState(5000);

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["inflight"],
    queryFn: () => apiClient.getInflightRequests(),
    refetchInterval: refetchInterval || false,
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-muted-foreground">{t("common.loading")}</div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Card className="border-destructive">
          <CardContent className="py-8 text-center">
            <p className="text-destructive font-medium">
              {t("inflight.failedToLoad")}
            </p>
            <p className="text-sm text-muted-foreground mt-2">
              {error instanceof Error
                ? error.message
                : t("detailDrawer.common.unknown")}
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const requests = data?.requests ?? [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            {t("pages.inflight.title")}
            {requests.length > 0 && (
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            )}
          </h1>
          <p className="text-muted-foreground">
            {t("pages.inflight.description")}
          </p>
        </div>
        <RefreshIntervalSelect value={refetchInterval} onChange={setRefetchInterval} />
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            {t("inflight.activeRequests")}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-3xl font-bold">{data?.total ?? 0}</div>
          {(data?.hosts ?? 1) > 1 && (
            <p className="text-xs text-muted-foreground mt-1">
              across {data!.hosts} hosts
            </p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t("inflight.requestTable")}</CardTitle>
          <CardDescription>{t("inflight.requestTableDescription")}</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {requests.length === 0 ? (
            <div className="py-12 text-center text-muted-foreground">
              <Radio className="h-8 w-8 mx-auto mb-3 opacity-30" />
              <p>{t("inflight.noRequests")}</p>
            </div>
          ) : (
            <div>
              {/* Header row */}
              <div className="flex items-center gap-4 py-2 px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider border-b">
                <span className="w-14 shrink-0">{t("metrics.method")}</span>
                <span className="flex-1">{t("metrics.endpoint")}</span>
                <span className="w-32 text-right hidden md:block">{t("inflight.clientIp")}</span>
                <span className="w-24 text-right hidden lg:block">{t("inflight.startedAt")}</span>
                <span className="w-16">{t("inflight.elapsed")}</span>
                <span className="w-20 hidden xl:block">{t("inflight.requestId")}</span>
              </div>
              {requests.map((req) => (
                <InflightRow key={req.request_id} req={req} />
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

