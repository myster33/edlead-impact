import { useState, useEffect } from "react";
import { format, subDays, startOfDay, eachDayOfInterval, eachWeekOfInterval, eachMonthOfInterval, startOfWeek, startOfMonth } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, TrendingUp, PieChart } from "lucide-react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart as RechartsPie,
  Pie,
  Cell,
  Legend,
  BarChart,
  Bar,
} from "recharts";

interface ApplicationChartsProps {
  regionInfo: {
    hasRestrictions: boolean;
    country: string | null;
    province: string | null;
  };
}

type TimeRange = "7d" | "30d" | "90d" | "all";

export function ApplicationCharts({ regionInfo }: ApplicationChartsProps) {
  const [timeRange, setTimeRange] = useState<TimeRange>("30d");
  const [isLoading, setIsLoading] = useState(true);
  const [trendData, setTrendData] = useState<{ date: string; total: number; approved: number; rejected: number; pending: number }[]>([]);
  const [statusData, setStatusData] = useState<{ name: string; value: number; color: string }[]>([]);
  const [provinceData, setProvinceData] = useState<{ province: string; count: number }[]>([]);

  useEffect(() => {
    fetchChartData();
  }, [timeRange, regionInfo]);

  const fetchChartData = async () => {
    setIsLoading(true);
    try {
      let query = supabase
        .from("applications")
        .select("status, created_at, province");

      // Apply region filters for non-admin users
      if (regionInfo.hasRestrictions && regionInfo.province) {
        query = query.eq("province", regionInfo.province);
      }

      // Apply time range filter
      if (timeRange !== "all") {
        const days = timeRange === "7d" ? 7 : timeRange === "30d" ? 30 : 90;
        const startDate = startOfDay(subDays(new Date(), days));
        query = query.gte("created_at", startDate.toISOString());
      }

      const { data, error } = await query;

      if (error) throw error;

      // Process status distribution
      const statusCounts = {
        pending: data?.filter(a => a.status === "pending").length || 0,
        approved: data?.filter(a => a.status === "approved").length || 0,
        rejected: data?.filter(a => a.status === "rejected").length || 0,
      };

      setStatusData([
        { name: "Pending", value: statusCounts.pending, color: "hsl(var(--chart-3))" },
        { name: "Approved", value: statusCounts.approved, color: "hsl(var(--chart-2))" },
        { name: "Rejected", value: statusCounts.rejected, color: "hsl(var(--destructive))" },
      ]);

      // Process province distribution
      const provinceCounts = new Map<string, number>();
      data?.forEach(app => {
        const province = app.province || "Unknown";
        provinceCounts.set(province, (provinceCounts.get(province) || 0) + 1);
      });
      
      const sortedProvinces = Array.from(provinceCounts.entries())
        .map(([province, count]) => ({ province, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 10);
      
      setProvinceData(sortedProvinces);

      // Process trend data
      if (data && data.length > 0) {
        const days = timeRange === "7d" ? 7 : timeRange === "30d" ? 30 : timeRange === "90d" ? 90 : 365;
        const endDate = new Date();
        const startDate = timeRange === "all" 
          ? new Date(Math.min(...data.map(d => new Date(d.created_at).getTime())))
          : subDays(endDate, days);

        let intervals: Date[];
        let formatStr: string;
        
        if (days <= 14) {
          intervals = eachDayOfInterval({ start: startDate, end: endDate });
          formatStr = "MMM d";
        } else if (days <= 90) {
          intervals = eachWeekOfInterval({ start: startDate, end: endDate });
          formatStr = "MMM d";
        } else {
          intervals = eachMonthOfInterval({ start: startDate, end: endDate });
          formatStr = "MMM yyyy";
        }

        const trendMap = new Map<string, { total: number; approved: number; rejected: number; pending: number }>();
        
        intervals.forEach(date => {
          const key = format(date, formatStr);
          trendMap.set(key, { total: 0, approved: 0, rejected: 0, pending: 0 });
        });

        data.forEach(app => {
          const appDate = new Date(app.created_at);
          let key: string;
          
          if (days <= 14) {
            key = format(startOfDay(appDate), formatStr);
          } else if (days <= 90) {
            key = format(startOfWeek(appDate), formatStr);
          } else {
            key = format(startOfMonth(appDate), formatStr);
          }

          const existing = trendMap.get(key);
          if (existing) {
            existing.total++;
            if (app.status === "approved") existing.approved++;
            else if (app.status === "rejected") existing.rejected++;
            else existing.pending++;
          }
        });

        setTrendData(
          Array.from(trendMap.entries()).map(([date, counts]) => ({
            date,
            ...counts,
          }))
        );
      } else {
        setTrendData([]);
      }
    } catch (error) {
      console.error("Error fetching chart data:", error);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="lg:col-span-2">
          <CardContent className="flex items-center justify-center h-[300px]">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Time Range Selector */}
      <div className="flex justify-end">
        <Tabs value={timeRange} onValueChange={(v) => setTimeRange(v as TimeRange)}>
          <TabsList>
            <TabsTrigger value="7d">7 Days</TabsTrigger>
            <TabsTrigger value="30d">30 Days</TabsTrigger>
            <TabsTrigger value="90d">90 Days</TabsTrigger>
            <TabsTrigger value="all">All Time</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Application Trend Chart */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Application Trends
            </CardTitle>
            <CardDescription>
              Applications submitted over time with status breakdown
            </CardDescription>
          </CardHeader>
          <CardContent>
            {trendData.length === 0 ? (
              <div className="flex items-center justify-center h-[300px] text-muted-foreground">
                No data available for the selected period
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={trendData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="colorApproved" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(var(--chart-2))" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="hsl(var(--chart-2))" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis 
                    dataKey="date" 
                    tick={{ fontSize: 12 }} 
                    tickLine={false}
                    axisLine={false}
                    className="fill-muted-foreground"
                  />
                  <YAxis 
                    tick={{ fontSize: 12 }} 
                    tickLine={false}
                    axisLine={false}
                    className="fill-muted-foreground"
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "hsl(var(--popover))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "var(--radius)",
                      color: "hsl(var(--popover-foreground))",
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="total"
                    stroke="hsl(var(--primary))"
                    fillOpacity={1}
                    fill="url(#colorTotal)"
                    strokeWidth={2}
                    name="Total"
                  />
                  <Area
                    type="monotone"
                    dataKey="approved"
                    stroke="hsl(var(--chart-2))"
                    fillOpacity={1}
                    fill="url(#colorApproved)"
                    strokeWidth={2}
                    name="Approved"
                  />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Status Distribution Pie Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <PieChart className="h-5 w-5" />
              Status Distribution
            </CardTitle>
            <CardDescription>
              Current application status breakdown
            </CardDescription>
          </CardHeader>
          <CardContent>
            {statusData.every(s => s.value === 0) ? (
              <div className="flex items-center justify-center h-[250px] text-muted-foreground">
                No applications in this period
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={250}>
                <RechartsPie>
                  <Pie
                    data={statusData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={90}
                    paddingAngle={2}
                    dataKey="value"
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    labelLine={false}
                  >
                    {statusData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "hsl(var(--popover))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "var(--radius)",
                      color: "hsl(var(--popover-foreground))",
                    }}
                  />
                  <Legend />
                </RechartsPie>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Province Distribution Bar Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              Applications by Province
            </CardTitle>
            <CardDescription>
              Top provinces by application count
            </CardDescription>
          </CardHeader>
          <CardContent>
            {provinceData.length === 0 ? (
              <div className="flex items-center justify-center h-[250px] text-muted-foreground">
                No applications in this period
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={provinceData} layout="vertical" margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" horizontal={false} />
                  <XAxis type="number" tick={{ fontSize: 12 }} className="fill-muted-foreground" />
                  <YAxis 
                    dataKey="province" 
                    type="category" 
                    tick={{ fontSize: 11 }} 
                    width={100}
                    className="fill-muted-foreground"
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "hsl(var(--popover))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "var(--radius)",
                      color: "hsl(var(--popover-foreground))",
                    }}
                  />
                  <Bar 
                    dataKey="count" 
                    fill="hsl(var(--primary))" 
                    radius={[0, 4, 4, 0]}
                    name="Applications"
                  />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
