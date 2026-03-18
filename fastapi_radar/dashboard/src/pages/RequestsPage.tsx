import { apiClient } from "@/api/client";
import { RequestItem } from "@/components/RequestItem";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { SearchInput } from "@/components/ui/search-input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { RefreshIntervalSelect } from "@/components/ui/refresh-interval-select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useDetailDrawer } from "@/context/DetailDrawerContext";
import { useDebounce } from "@/hooks/useDebounce";
import { useT } from "@/i18n";
import { useQuery } from "@tanstack/react-query";
import { ChevronLeft, ChevronRight, Download, Filter, RefreshCw } from "lucide-react";
import { useEffect, useState } from "react";

export function RequestsPage() {
  const [statusFilter, setStatusFilter] = useState("all");
  const [methodFilter, setMethodFilter] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [activeTab, setActiveTab] = useState("all");
  const [timeRange, setTimeRange] = useState<number | null>(null); // hours
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [refreshInterval, setRefreshInterval] = useState(5000);
  const { openDetail } = useDetailDrawer();
  const t = useT();

  const debouncedSearchTerm = useDebounce(searchTerm, 300);

  useEffect(() => {
    setPage(1);
  }, [statusFilter, methodFilter, debouncedSearchTerm, timeRange, activeTab]);

  const getStatusCode = (filter: string) => {
    switch (filter) {
      case "2xx":
        return 200;
      case "3xx":
        return 300;
      case "4xx":
        return 400;
      case "5xx":
        return 500;
      default:
        return undefined;
    }
  };

  const getCountsParams = () => {
    const params: any = {
      status_code: statusFilter !== "all" ? getStatusCode(statusFilter) : undefined,
      method: methodFilter !== "all" ? methodFilter : undefined,
      search: debouncedSearchTerm || undefined,
    };
    if (timeRange) {
      params.start_time = new Date(Date.now() - timeRange * 60 * 60 * 1000).toISOString();
    }
    return params;
  };

  const getTabParams = (tab: string) => {
    switch (tab) {
      case "successful":
        return { status_code: 200 };
      case "failed":
        return { min_status_code: 400 };
      case "slow":
        return { slow_only: true, slow_threshold: 500 };
      default:
        return {};
    }
  };

  // Get all requests
  const { data: allRequests, refetch } = useQuery({
    queryKey: ["all-requests", statusFilter, methodFilter, debouncedSearchTerm, timeRange, page, pageSize, activeTab],
    queryFn: () => {
      const params: any = {
        limit: pageSize,
        offset: (page - 1) * pageSize,
        ...getCountsParams(),
        ...getTabParams(activeTab),
      };
      return apiClient.getRequests(params);
    },
    refetchInterval: refreshInterval || false,
  });

  // Fetch total counts from the server (unaffected by pagination)
  const { data: requestCounts } = useQuery({
    queryKey: ["request-counts", statusFilter, methodFilter, debouncedSearchTerm, timeRange],
    queryFn: () => apiClient.getRequestCounts(getCountsParams()),
    refetchInterval: refreshInterval || false,
  });

  const successfulCount = requestCounts?.successful ?? 0;
  const failedCount = requestCounts?.failed ?? 0;
  const slowCount = requestCounts?.slow ?? 0;

  const filteredRequests = allRequests;

  const applyFilters = () => {
    refetch();
  };

  const exportData = () => {
    if (filteredRequests) {
      const data = JSON.stringify(filteredRequests, null, 2);
      const blob = new Blob([data], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `requests-${new Date().toISOString()}.json`;
      a.click();
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{t('pages.requests.title')}</h1>
          <p className="text-muted-foreground">
            {t('pages.requests.description')}
          </p>
        </div>
        <RefreshIntervalSelect value={refreshInterval} onChange={setRefreshInterval} />
      </div>

      {/* Filters and Actions */}
      <Card>
        <CardHeader>
          <CardTitle>{t('common.filter')}</CardTitle>
          <CardDescription>
            {t('requests.filters.description')}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="grid gap-4 md:grid-cols-4">
              <div className="space-y-2">
                <Label htmlFor="search">{t('common.search')}</Label>
                <SearchInput
                  id="search"
                  placeholder={t('requests.filters.searchPlaceholder')}
                  value={searchTerm}
                  onValueChange={setSearchTerm}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="status">{t('requests.filters.status')}</Label>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger id="status">
                    <SelectValue placeholder={t('requests.statusFilters.all')} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{t('requests.statusFilters.all')}</SelectItem>
                    <SelectItem value="2xx">{t('requests.statusFilters.success')}</SelectItem>
                    <SelectItem value="3xx">{t('requests.statusFilters.redirect')}</SelectItem>
                    <SelectItem value="4xx">{t('requests.statusFilters.clientErrors')}</SelectItem>
                    <SelectItem value="5xx">{t('requests.statusFilters.serverErrors')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="method">{t('requests.filters.method')}</Label>
                <Select value={methodFilter} onValueChange={setMethodFilter}>
                  <SelectTrigger id="method">
                    <SelectValue placeholder={t('requests.methodFilters.all')} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{t('requests.methodFilters.all')}</SelectItem>
                    <SelectItem value="GET">{t('requests.methodFilters.get')}</SelectItem>
                    <SelectItem value="POST">{t('requests.methodFilters.post')}</SelectItem>
                    <SelectItem value="PUT">{t('requests.methodFilters.put')}</SelectItem>
                    <SelectItem value="PATCH">{t('requests.methodFilters.patch')}</SelectItem>
                    <SelectItem value="DELETE">{t('requests.methodFilters.delete')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>&nbsp;</Label>
                <div className="flex gap-2">
                  <Button variant="outline" size="icon" onClick={() => refetch()}>
                    <RefreshCw className="h-4 w-4" />
                  </Button>
                  <Button variant="outline" size="icon" onClick={exportData}>
                    <Download className="h-4 w-4" />
                  </Button>
                  <Button onClick={applyFilters}>
                    <Filter className="mr-2 h-4 w-4" />
                    {t('requests.filters.apply')}
                  </Button>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Label>{t('requests.filters.timeRange')}</Label>
              <div className="flex gap-2">
                <Button
                  variant={timeRange === null ? "default" : "outline"}
                  size="sm"
                  onClick={() => setTimeRange(null)}
                >
                  {t('requests.timeRangeFilters.all')}
                </Button>
                <Button
                  variant={timeRange === 1 ? "default" : "outline"}
                  size="sm"
                  onClick={() => setTimeRange(1)}
                >
                  {t('requests.timeRangeFilters.lastHour')}
                </Button>
                <Button
                  variant={timeRange === 24 ? "default" : "outline"}
                  size="sm"
                  onClick={() => setTimeRange(24)}
                >
                  {t('requests.timeRangeFilters.last24Hours')}
                </Button>
                <Button
                  variant={timeRange === 168 ? "default" : "outline"}
                  size="sm"
                  onClick={() => setTimeRange(168)}
                >
                  {t('requests.timeRangeFilters.last7Days')}
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Request Tabs */}
      <Tabs
        value={activeTab}
        onValueChange={setActiveTab}
        className="space-y-4"
      >
        <TabsList>
          <TabsTrigger value="all">
            {t('requests.tabs.all')}
            {requestCounts && requestCounts.total > 0 && (
              <Badge variant="outline" className="ml-2">
                {requestCounts.total}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="successful">
            {t('requests.tabs.successful')}
            {successfulCount > 0 && (
              <Badge variant="outline" className="ml-2">
                {successfulCount}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="failed">
            {t('requests.tabs.failed')}
            {failedCount > 0 && (
              <Badge variant="destructive" className="ml-2">
                {failedCount}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="slow">
            {t('requests.tabs.slow')}
            {slowCount > 0 && (
              <Badge variant="secondary" className="ml-2">
                {slowCount}
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value={activeTab} className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>
                {activeTab === "all" && t('requests.tabs.all')}
                {activeTab === "successful" && t('requests.tabs.successful')}
                {activeTab === "failed" && t('requests.tabs.failed')}
                {activeTab === "slow" && t('requests.tabs.slow')}
              </CardTitle>
              <CardDescription>
                {activeTab === "all" && t('requests.descriptions.all')}
                {activeTab === "successful" && t('requests.descriptions.successful')}
                {activeTab === "failed" && t('requests.descriptions.failed')}
                {activeTab === "slow" && t('requests.descriptions.slow')}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {filteredRequests?.map((request) => (
                  <RequestItem
                    key={request.id}
                    request={request}
                    onClick={() => openDetail("request", request.request_id)}
                  />
                ))}
                {(!filteredRequests || filteredRequests.length === 0) && (
                  <div className="text-center py-8 text-muted-foreground">
                    {activeTab === "all" && t('requests.empty.all')}
                    {activeTab === "successful" && t('requests.empty.successful')}
                    {activeTab === "failed" && t('requests.empty.failed')}
                    {activeTab === "slow" && t('requests.empty.slow')}
                  </div>
                )}
              </div>

              {/* Pagination */}
              <div className="flex items-center justify-between pt-4 border-t">
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">
                    {t('requests.pagination.pageSize')}
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
                    {t('requests.pagination.previous')}
                  </Button>
                  <span className="text-sm text-muted-foreground">
                    {t('requests.pagination.page')} {page}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage((p) => p + 1)}
                    disabled={(allRequests?.length ?? 0) < pageSize}
                  >
                    {t('requests.pagination.next')}
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
