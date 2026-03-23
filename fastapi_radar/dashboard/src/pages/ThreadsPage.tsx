import { apiClient, ThreadInfo } from "@/api/client";
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
import { Cpu } from "lucide-react";
import { useState } from "react";

function ThreadCard({ thread }: { thread: ThreadInfo }) {
    const [expanded, setExpanded] = useState(false);

    return (
        <div className="border rounded-lg p-4 space-y-2">
            <div className="flex items-center justify-between gap-2 flex-wrap">
                <div className="flex items-center gap-2">
                    <Cpu className="h-4 w-4 text-muted-foreground shrink-0" />
                    <span className="font-mono text-sm font-medium">{thread.name}</span>
                    {thread.id !== null && (
                        <span className="text-xs text-muted-foreground font-mono">
                            #{thread.id}
                        </span>
                    )}
                </div>
                <div className="flex items-center gap-2">
                    {thread.host && (
                        <span className="text-xs font-mono bg-muted px-1.5 py-0.5 rounded">
                            {thread.host}
                        </span>
                    )}
                    <Badge variant={thread.alive ? "default" : "secondary"}>
                        {thread.alive ? "alive" : "dead"}
                    </Badge>
                    <Badge variant={thread.daemon ? "outline" : "secondary"}>
                        {thread.daemon ? "daemon" : "non-daemon"}
                    </Badge>
                </div>
            </div>
            {thread.stack_trace.length > 0 && (
                <div>
                    <button
                        className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                        onClick={() => setExpanded((v) => !v)}
                    >
                        {expanded ? "Hide" : "Show"} stack trace ({thread.stack_trace.length} frames)
                    </button>
                    {expanded && (
                        <pre className="mt-2 text-xs bg-muted p-3 rounded overflow-x-auto whitespace-pre-wrap break-all">
                            {thread.stack_trace.join("")}
                        </pre>
                    )}
                </div>
            )}
        </div>
    );
}

export function ThreadsPage() {
    const t = useT();
    const [refreshInterval, setRefreshInterval] = useState(10000);

    const { data, isLoading, isError, error } = useQuery({
        queryKey: ["threads"],
        queryFn: () => apiClient.getThreads(),
        refetchInterval: refreshInterval || false,
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
                        <p className="text-destructive font-medium">{t("threads.failedToLoad")}</p>
                        <p className="text-sm text-muted-foreground mt-2">
                            {error instanceof Error ? error.message : t("detailDrawer.common.unknown")}
                        </p>
                    </CardContent>
                </Card>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">
                        {t("pages.threads.title")}
                    </h1>
                    <p className="text-muted-foreground">
                        {t("pages.threads.description")}
                    </p>
                </div>
                <RefreshIntervalSelect value={refreshInterval} onChange={setRefreshInterval} />
            </div>

            {/* Summary cards */}
            <div className="grid gap-4 md:grid-cols-3">
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">
                            {t("threads.totalThreads")}
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-bold">{data?.total ?? 0}</div>
                        {(data?.hosts ?? 1) > 1 && (
                            <p className="text-xs text-muted-foreground mt-1">across {data!.hosts} hosts</p>
                        )}
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">
                            {t("threads.daemonThreads")}
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-bold">{data?.daemon_count ?? 0}</div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">
                            {t("threads.nonDaemonThreads")}
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-bold">{data?.non_daemon_count ?? 0}</div>
                    </CardContent>
                </Card>
            </div>

            {/* Thread list */}
            <Card>
                <CardHeader>
                    <CardTitle>{t("threads.threadList")}</CardTitle>
                    <CardDescription>{t("threads.threadListDescription")}</CardDescription>
                </CardHeader>
                <CardContent>
                    {!data?.threads?.length ? (
                        <p className="text-center text-muted-foreground py-8">
                            {t("common.noData")}
                        </p>
                    ) : (
                        <div className="space-y-3">
                            {data.threads.map((thread) => (
                                <ThreadCard
                                    key={thread.id ?? thread.name}
                                    thread={thread}
                                />
                            ))}
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
