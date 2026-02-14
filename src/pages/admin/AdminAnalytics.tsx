import { useState, useEffect, useMemo } from "react";
import { useAdminAuth } from "@/contexts/AdminAuthContext";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { 
  BarChart3,
  TrendingUp,
  TrendingDown,
  Users,
  CheckCircle,
  XCircle,
  Clock,
  Loader2,
  RefreshCw,
  MapPin,
  School,
  UserCheck,
  Percent
} from "lucide-react";
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  ResponsiveContainer,
  Legend,
  FunnelChart,
  Funnel,
  LabelList,
} from "recharts";
import { differenceInYears, format, startOfMonth, subMonths } from "date-fns";

interface Application {
  id: string;
  status: string;
  province: string;
  created_at: string;
  grade: string;
  gender: string | null;
  date_of_birth: string;
  school_name: string;
}

export default function AdminAnalytics() {
  const { adminUser, signOut } = useAdminAuth();
  const { toast } = useToast();
  
  const [applications, setApplications] = useState<Application[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [timeRange, setTimeRange] = useState<string>("all");

  useEffect(() => {
    fetchApplications();
  }, []);

  const fetchApplications = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from("applications")
        .select("id, status, province, created_at, grade, gender, date_of_birth, school_name")
        .order("created_at", { ascending: true });

      if (error) throw error;
      setApplications(data || []);
    } catch (error) {
      console.error("Error fetching applications:", error);
      toast({
        title: "Error",
        description: "Failed to load analytics data.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const filteredApplications = useMemo(() => {
    if (timeRange === "all") return applications;
    
    const now = new Date();
    const cutoff = new Date();
    
    switch (timeRange) {
      case "7d":
        cutoff.setDate(now.getDate() - 7);
        break;
      case "30d":
        cutoff.setDate(now.getDate() - 30);
        break;
      case "90d":
        cutoff.setDate(now.getDate() - 90);
        break;
      default:
        return applications;
    }
    
    return applications.filter(app => new Date(app.created_at) >= cutoff);
  }, [applications, timeRange]);

  // Stats
  const stats = useMemo(() => {
    const total = filteredApplications.length;
    const pending = filteredApplications.filter(a => a.status === "pending").length;
    const approved = filteredApplications.filter(a => a.status === "approved").length;
    const rejected = filteredApplications.filter(a => a.status === "rejected").length;
    const approvalRate = total > 0 ? ((approved / total) * 100).toFixed(1) : "0";
    const rejectionRate = total > 0 ? ((rejected / total) * 100).toFixed(1) : "0";
    
    return { total, pending, approved, rejected, approvalRate, rejectionRate };
  }, [filteredApplications]);

  // Trend data - applications over time
  const trendData = useMemo(() => {
    const grouped: Record<string, { date: string; count: number; approved: number; rejected: number }> = {};
    
    filteredApplications.forEach(app => {
      const date = new Date(app.created_at).toLocaleDateString("en-ZA", { 
        month: "short", 
        day: "numeric" 
      });
      
      if (!grouped[date]) {
        grouped[date] = { date, count: 0, approved: 0, rejected: 0 };
      }
      grouped[date].count++;
      if (app.status === "approved") grouped[date].approved++;
      if (app.status === "rejected") grouped[date].rejected++;
    });
    
    return Object.values(grouped).slice(-14);
  }, [filteredApplications]);

  // Province distribution
  const provinceData = useMemo(() => {
    const grouped: Record<string, number> = {};
    
    filteredApplications.forEach(app => {
      const province = app.province || "Unknown";
      grouped[province] = (grouped[province] || 0) + 1;
    });
    
    return Object.entries(grouped)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
  }, [filteredApplications]);

  // Status distribution for pie chart
  const statusData = useMemo(() => {
    return [
      { name: "Pending", value: stats.pending, color: "hsl(var(--muted-foreground))" },
      { name: "Approved", value: stats.approved, color: "hsl(142, 76%, 36%)" },
      { name: "Rejected", value: stats.rejected, color: "hsl(var(--destructive))" },
    ].filter(d => d.value > 0);
  }, [stats]);

  // Grade distribution
  const gradeData = useMemo(() => {
    const grouped: Record<string, number> = {};
    
    filteredApplications.forEach(app => {
      const grade = app.grade || "Unknown";
      grouped[grade] = (grouped[grade] || 0) + 1;
    });
    
    return Object.entries(grouped)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => {
        const aNum = parseInt(a.name.replace(/\D/g, "")) || 0;
        const bNum = parseInt(b.name.replace(/\D/g, "")) || 0;
        return aNum - bNum;
      });
  }, [filteredApplications]);

  // Gender distribution
  const genderData = useMemo(() => {
    const grouped: Record<string, number> = {};
    filteredApplications.forEach(app => {
      const gender = app.gender || "Not specified";
      grouped[gender] = (grouped[gender] || 0) + 1;
    });
    const colors: Record<string, string> = {
      "Male": "hsl(221, 83%, 53%)",
      "Female": "hsl(330, 81%, 60%)",
      "Other": "hsl(142, 76%, 36%)",
      "Not specified": "hsl(var(--muted-foreground))",
    };
    return Object.entries(grouped)
      .map(([name, value]) => ({ name, value, color: colors[name] || "hsl(var(--primary))" }))
      .filter(d => d.value > 0);
  }, [filteredApplications]);

  // Age distribution
  const ageData = useMemo(() => {
    const now = new Date();
    const buckets: Record<string, number> = {
      "13-14": 0, "15-16": 0, "17-18": 0, "19+": 0,
    };
    filteredApplications.forEach(app => {
      if (!app.date_of_birth) return;
      const age = differenceInYears(now, new Date(app.date_of_birth));
      if (age <= 14) buckets["13-14"]++;
      else if (age <= 16) buckets["15-16"]++;
      else if (age <= 18) buckets["17-18"]++;
      else buckets["19+"]++;
    });
    return Object.entries(buckets)
      .map(([name, value]) => ({ name, value }))
      .filter(d => d.value > 0);
  }, [filteredApplications]);

  // Conversion funnel
  const funnelData = useMemo(() => {
    return [
      { name: "Total Applications", value: stats.total, fill: "hsl(var(--primary))" },
      { name: "Reviewed", value: stats.approved + stats.rejected, fill: "hsl(221, 83%, 53%)" },
      { name: "Approved", value: stats.approved, fill: "hsl(142, 76%, 36%)" },
    ].filter(d => d.value > 0);
  }, [stats]);

  // Month-over-month comparison
  const monthlyComparison = useMemo(() => {
    const now = new Date();
    const months: { month: string; total: number; approved: number; rejected: number }[] = [];
    for (let i = 5; i >= 0; i--) {
      const monthStart = startOfMonth(subMonths(now, i));
      const monthEnd = startOfMonth(subMonths(now, i - 1));
      const label = format(monthStart, "MMM yyyy");
      const inRange = applications.filter(app => {
        const d = new Date(app.created_at);
        return d >= monthStart && d < monthEnd;
      });
      months.push({
        month: label,
        total: inRange.length,
        approved: inRange.filter(a => a.status === "approved").length,
        rejected: inRange.filter(a => a.status === "rejected").length,
      });
    }
    return months;
  }, [applications]);

  // Top schools
  const topSchools = useMemo(() => {
    const grouped: Record<string, { total: number; approved: number; rejected: number; pending: number }> = {};
    filteredApplications.forEach(app => {
      const school = app.school_name || "Unknown";
      if (!grouped[school]) grouped[school] = { total: 0, approved: 0, rejected: 0, pending: 0 };
      grouped[school].total++;
      if (app.status === "approved") grouped[school].approved++;
      else if (app.status === "rejected") grouped[school].rejected++;
      else grouped[school].pending++;
    });
    return Object.entries(grouped)
      .map(([name, data]) => ({ name, ...data }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 10);
  }, [filteredApplications]);

  const chartConfig = {
    count: { label: "Applications", color: "hsl(var(--primary))" },
    total: { label: "Total", color: "hsl(var(--primary))" },
    approved: { label: "Approved", color: "hsl(142, 76%, 36%)" },
    rejected: { label: "Rejected", color: "hsl(var(--destructive))" },
    value: { label: "Count", color: "hsl(var(--primary))" },
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-muted/30 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <AdminLayout>
      <div className="space-y-8">
        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <p className="text-muted-foreground">
              Application trends and insights
            </p>
          </div>
          <div className="flex gap-2">
            <Select value={timeRange} onValueChange={setTimeRange}>
              <SelectTrigger className="w-[140px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Time</SelectItem>
                <SelectItem value="7d">Last 7 Days</SelectItem>
                <SelectItem value="30d">Last 30 Days</SelectItem>
                <SelectItem value="90d">Last 90 Days</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" size="icon" onClick={fetchApplications}>
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Key Metrics */}
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4 mb-8">
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Total</CardDescription>
              <CardTitle className="text-2xl flex items-center gap-2">
                <Users className="h-5 w-5 text-primary" />
                {stats.total}
              </CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Pending</CardDescription>
              <CardTitle className="text-2xl flex items-center gap-2">
                <Clock className="h-5 w-5 text-yellow-500" />
                {stats.pending}
              </CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Approved</CardDescription>
              <CardTitle className="text-2xl flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-green-500" />
                {stats.approved}
              </CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Rejected</CardDescription>
              <CardTitle className="text-2xl flex items-center gap-2">
                <XCircle className="h-5 w-5 text-destructive" />
                {stats.rejected}
              </CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Approval Rate</CardDescription>
              <CardTitle className="text-2xl flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-green-500" />
                {stats.approvalRate}%
              </CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Rejection Rate</CardDescription>
              <CardTitle className="text-2xl flex items-center gap-2">
                <TrendingDown className="h-5 w-5 text-destructive" />
                {stats.rejectionRate}%
              </CardTitle>
            </CardHeader>
          </Card>
        </div>

        {/* Charts Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Applications Over Time */}
          <Card className="col-span-1 lg:col-span-2">
            <CardHeader>
              <CardTitle>Applications Over Time</CardTitle>
              <CardDescription>Daily application submissions</CardDescription>
            </CardHeader>
            <CardContent>
              {trendData.length > 0 ? (
                <ChartContainer config={chartConfig} className="h-[300px] w-full">
                  <LineChart data={trendData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis allowDecimals={false} />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Legend />
                    <Line 
                      type="monotone" 
                      dataKey="count" 
                      stroke="hsl(var(--primary))" 
                      strokeWidth={2}
                      dot={{ fill: "hsl(var(--primary))" }}
                      name="Total"
                    />
                    <Line 
                      type="monotone" 
                      dataKey="approved" 
                      stroke="hsl(142, 76%, 36%)" 
                      strokeWidth={2}
                      dot={{ fill: "hsl(142, 76%, 36%)" }}
                      name="Approved"
                    />
                  </LineChart>
                </ChartContainer>
              ) : (
                <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                  No data available
                </div>
              )}
            </CardContent>
          </Card>

          {/* Gender Distribution */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <UserCheck className="h-5 w-5" />
                Gender Distribution
              </CardTitle>
              <CardDescription>Applications by gender</CardDescription>
            </CardHeader>
            <CardContent>
              {genderData.length > 0 ? (
                <ChartContainer config={chartConfig} className="h-[300px] w-full">
                  <PieChart>
                    <Pie
                      data={genderData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={100}
                      paddingAngle={2}
                      dataKey="value"
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    >
                      {genderData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Legend />
                  </PieChart>
                </ChartContainer>
              ) : (
                <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                  No data available
                </div>
              )}
            </CardContent>
          </Card>

          {/* Age Distribution */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5" />
                Age Distribution
              </CardTitle>
              <CardDescription>Applications by age group</CardDescription>
            </CardHeader>
            <CardContent>
              {ageData.length > 0 ? (
                <ChartContainer config={chartConfig} className="h-[300px] w-full">
                  <BarChart data={ageData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis allowDecimals={false} />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Bar 
                      dataKey="value" 
                      fill="hsl(var(--primary))" 
                      radius={[4, 4, 0, 0]}
                      name="Applications"
                    />
                  </BarChart>
                </ChartContainer>
              ) : (
                <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                  No data available
                </div>
              )}
            </CardContent>
          </Card>

          {/* Province Distribution */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MapPin className="h-5 w-5" />
                Province Distribution
              </CardTitle>
              <CardDescription>Applications by province</CardDescription>
            </CardHeader>
            <CardContent>
              {provinceData.length > 0 ? (
                <ChartContainer config={chartConfig} className="h-[300px] w-full">
                  <BarChart data={provinceData} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis type="number" allowDecimals={false} />
                    <YAxis 
                      dataKey="name" 
                      type="category" 
                      width={100}
                      tick={{ fontSize: 12 }}
                    />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Bar 
                      dataKey="value" 
                      fill="hsl(var(--primary))" 
                      radius={[0, 4, 4, 0]}
                      name="Applications"
                    />
                  </BarChart>
                </ChartContainer>
              ) : (
                <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                  No data available
                </div>
              )}
            </CardContent>
          </Card>

          {/* Status Distribution */}
          <Card>
            <CardHeader>
              <CardTitle>Status Distribution</CardTitle>
              <CardDescription>Current application status breakdown</CardDescription>
            </CardHeader>
            <CardContent>
              {statusData.length > 0 ? (
                <ChartContainer config={chartConfig} className="h-[300px] w-full">
                  <PieChart>
                    <Pie
                      data={statusData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={100}
                      paddingAngle={2}
                      dataKey="value"
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    >
                      {statusData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Legend />
                  </PieChart>
                </ChartContainer>
              ) : (
                <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                  No data available
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Conversion Funnel */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Percent className="h-5 w-5" />
              Conversion Funnel
            </CardTitle>
            <CardDescription>Application processing pipeline</CardDescription>
          </CardHeader>
          <CardContent>
            {funnelData.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {funnelData.map((step, index) => {
                  const percentage = funnelData[0].value > 0
                    ? ((step.value / funnelData[0].value) * 100).toFixed(1)
                    : "0";
                  return (
                    <Card key={step.name} className="relative overflow-hidden">
                      <div
                        className="absolute bottom-0 left-0 right-0 opacity-10"
                        style={{
                          backgroundColor: step.fill,
                          height: `${percentage}%`,
                        }}
                      />
                      <CardContent className="pt-6 text-center relative">
                        <p className="text-sm text-muted-foreground mb-1">{step.name}</p>
                        <p className="text-3xl font-bold">{step.value}</p>
                        <p className="text-sm text-muted-foreground mt-1">{percentage}% of total</p>
                        {index < funnelData.length - 1 && (
                          <div className="absolute -right-3 top-1/2 -translate-y-1/2 text-muted-foreground hidden md:block">
                            →
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            ) : (
              <div className="h-[200px] flex items-center justify-center text-muted-foreground">
                No data available
              </div>
            )}
          </CardContent>
        </Card>

        {/* Month-over-Month Comparison */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Month-over-Month Trends
            </CardTitle>
            <CardDescription>Last 6 months comparison</CardDescription>
          </CardHeader>
          <CardContent>
            {monthlyComparison.some(m => m.total > 0) ? (
              <ChartContainer config={chartConfig} className="h-[300px] w-full">
                <BarChart data={monthlyComparison}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                  <YAxis allowDecimals={false} />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Legend />
                  <Bar dataKey="approved" stackId="a" fill="hsl(142, 76%, 36%)" name="Approved" radius={[0, 0, 0, 0]} />
                  <Bar dataKey="rejected" stackId="a" fill="hsl(var(--destructive))" name="Rejected" radius={[0, 0, 0, 0]} />
                  <Bar dataKey="total" fill="hsl(var(--primary))" name="Total" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ChartContainer>
            ) : (
              <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                No data available
              </div>
            )}
          </CardContent>
        </Card>

        {/* Grade Distribution */}
        <Card>
          <CardHeader>
            <CardTitle>Grade Distribution</CardTitle>
            <CardDescription>Applications by grade level</CardDescription>
          </CardHeader>
          <CardContent>
            {gradeData.length > 0 ? (
              <ChartContainer config={chartConfig} className="h-[250px] w-full">
                <BarChart data={gradeData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis allowDecimals={false} />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Bar 
                    dataKey="value" 
                    fill="hsl(var(--primary))" 
                    radius={[4, 4, 0, 0]}
                    name="Applications"
                  />
                </BarChart>
              </ChartContainer>
            ) : (
              <div className="h-[250px] flex items-center justify-center text-muted-foreground">
                No data available
              </div>
            )}
          </CardContent>
        </Card>

        {/* Top Schools */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <School className="h-5 w-5" />
              Top Schools by Applications
            </CardTitle>
            <CardDescription>Schools with the most applications</CardDescription>
          </CardHeader>
          <CardContent>
            {topSchools.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[40px]">#</TableHead>
                    <TableHead>School Name</TableHead>
                    <TableHead className="text-center">Total</TableHead>
                    <TableHead className="text-center">Approved</TableHead>
                    <TableHead className="text-center">Pending</TableHead>
                    <TableHead className="text-center">Rejected</TableHead>
                    <TableHead className="text-center">Approval Rate</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {topSchools.map((school, index) => {
                    const rate = school.total > 0
                      ? ((school.approved / school.total) * 100).toFixed(0)
                      : "0";
                    return (
                      <TableRow key={school.name}>
                        <TableCell className="font-medium text-muted-foreground">{index + 1}</TableCell>
                        <TableCell className="font-medium">{school.name}</TableCell>
                        <TableCell className="text-center">{school.total}</TableCell>
                        <TableCell className="text-center text-green-600">{school.approved}</TableCell>
                        <TableCell className="text-center text-yellow-600">{school.pending}</TableCell>
                        <TableCell className="text-center text-destructive">{school.rejected}</TableCell>
                        <TableCell className="text-center">{rate}%</TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            ) : (
              <div className="h-[200px] flex items-center justify-center text-muted-foreground">
                No data available
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}
