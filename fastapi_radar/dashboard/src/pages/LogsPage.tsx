import { apiClient, LogRecord } from "@/api/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useT } from "@/i18n";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { ChevronDown, ChevronLeft, ChevronRight, ChevronUp, RefreshCw, Search } from "lucide-react";
import { useState } from "react";

const LEVEL_COLORS: Record<
  string,
  "default" | "destructive" | "secondary" | "outline"
> = {
  DEBUG: "outline",
  INFO: "secondary",
  WARNING: "default",
  ERROR: "destructive",
  CRITICAL: "destructive",
};

function LogRow({ log }: { log: LogRecord }) {
  const [expanded, setExpanded] = useState(false);
  const hasDetails = !!(log.exc_info || log.pathname);

  return (
    <div className="border-b last:border-b-0 py-3 px-4 hover:bg-muted/30">
      <div className="flex items-start gap-3">
        <Badge
          variant={LEVEL_COLORS[log.level] ?? "outline"}
          className="shrink-0 mt-0.5 font-mono text-xs w-16 justify-center"
        >
          {log.level}
        </Badge>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs text-muted-foreground font-mono">
              {format(new Date(log.created_at), "HH:mm:ss.SSS")}
            </span>
            {log.logger_name && (
              <span className="text-xs text-muted-foreground">
                [{log.logger_name}]
              </span>
            )}
          </div>
          <p className="text-sm mt-0.5 break-words font-mono">{log.message}</p>
          {log.pathname && (
            <p className="text-xs text-muted-foreground mt-0.5 font-mono">
              {log.pathname}
              {log.lineno ? `:${log.lineno}` : ""}
              {log.func_name ? ` in ${log.func_name}` : ""}
            </p>
          )}
          {log.exc_info && (
            <div className="mt-1">
              <Button
                variant="ghost"
                size="sm"
                className="h-6 px-1 text-xs text-muted-foreground hover:text-foreground"
                onClick={() => setExpanded((v) => !v)}
              >
                {expanded ? (
                  <ChevronUp className="h-3 w-3 mr-1" />
                ) : (
                  <ChevronDown className="h-3 w-3 mr-1" />
                )}
                {expanded ? "Hide traceback" : "Show traceback"}
              </Button>
              {expanded && (
                <pre className="mt-1 text-xs bg-muted rounded p-2 overflow-x-auto whitespace-pre-wrap">
                  {log.exc_info}
                </pre>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export function LogsPage() {
  const t = useT();
  const [search, setSearch] = useState("");
  const [level, setLevel] = useState<string>("all");
  const [appliedSearch, setAppliedSearch] = useState("");
  const [appliedLevel, setAppliedLevel] = useState<string>("all");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);

  const { data: logs, isLoading, isError, refetch } = useQuery({
    queryKey: ["logs", appliedLevel, appliedSearch, page, pageSize],
    queryFn: () =>
      apiClient.getLogs({
        limit: pageSize,
        offset: (page - 1) * pageSize,
        level: appliedLevel !== "all" ? appliedLevel : undefined,
        search: appliedSearch || undefined,
      }),
    refetchInterval: 5000,
  });

  const applyFilters = () => {
    setAppliedSearch(search);
    setAppliedLevel(level);
    setPage(1);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") applyFilters();
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">
          {t("pages.logs.title")}
        </h1>
        <p className="text-muted-foreground">{t("pages.logs.description")}</p>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-4 pb-4">
          <div className="flex flex-wrap gap-3 items-end">
            <div className="flex-1 min-w-[200px]">
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder={t("logs.searchPlaceholder")}
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  onKeyDown={handleKeyDown}
                  className="pl-8"
                />
              </div>
            </div>

            <Select value={level} onValueChange={setLevel}>
              <SelectTrigger className="w-[160px]">
                <SelectValue placeholder={t("logs.level")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t("logs.levelFilters.all")}</SelectItem>
                <SelectItem value="DEBUG">DEBUG</SelectItem>
                <SelectItem value="INFO">INFO</SelectItem>
                <SelectItem value="WARNING">WARNING</SelectItem>
                <SelectItem value="ERROR">ERROR</SelectItem>
                <SelectItem value="CRITICAL">CRITICAL</SelectItem>
              </SelectContent>
            </Select>

            <Button onClick={applyFilters}>{t("requests.filters.apply")}</Button>
            <Button variant="outline" size="icon" onClick={() => refetch()}>
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Log list */}
      <Card>
        <CardHeader className="pb-0">
          <CardTitle>
            {t("logs.records")}
            {logs && (
              <span className="ml-2 text-sm font-normal text-muted-foreground">
                ({logs.length})
              </span>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0 mt-4">
          {isLoading && (
            <div className="py-8 text-center text-muted-foreground">
              {t("common.loading")}
            </div>
          )}
          {isError && (
            <div className="py-8 text-center text-destructive">
              {t("common.error")}
            </div>
          )}
          {!isLoading && !isError && (!logs || logs.length === 0) && (
            <div className="py-8 text-center text-muted-foreground">
              {t("logs.noLogs")}
            </div>
          )}
          {logs && logs.length > 0 && (
            <div>
              {logs.map((log) => (
                <LogRow key={log.id} log={log} />
              ))}
            </div>
          )}

          {/* Pagination */}
          <div className="flex items-center justify-between pt-4 px-4 pb-4 border-t">
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">
                {t("logs.pagination.pageSize")}
              </span>
              <Select
                value={String(pageSize)}
                onValueChange={(v) => {
                  setPageSize(Number(v));
                  setPage(1);
                }}
              >
                <SelectTrigger className="w-20">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="25">25</SelectItem>
                  <SelectItem value="50">50</SelectItem>
                  <SelectItem value="100">100</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => p - 1)}
                disabled={page === 1}
              >
                <ChevronLeft className="h-4 w-4" />
                {t("logs.pagination.previous")}
              </Button>
              <span className="text-sm text-muted-foreground">
                {t("logs.pagination.page")} {page}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => p + 1)}
                disabled={(logs?.length ?? 0) < pageSize}
              >
                {t("logs.pagination.next")}
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
