import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, Users } from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
  PieChart,
  Pie,
  Legend,
} from "recharts";

interface CohortStats {
  id: string;
  name: string;
  year: number;
  cohort_number: number;
  is_active: boolean;
  total: number;
  pending: number;
  approved: number;
  rejected: number;
}

interface CohortStatisticsProps {
  regionInfo: {
    hasRestrictions: boolean;
    country: string | null;
    province: string | null;
  };
}

const COLORS = ["hsl(var(--primary))", "hsl(var(--chart-2))", "hsl(var(--chart-3))", "hsl(var(--chart-4))", "hsl(var(--chart-5))"];

export function CohortStatistics({ regionInfo }: CohortStatisticsProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [cohortStats, setCohortStats] = useState<CohortStats[]>([]);

  useEffect(() => {
    fetchCohortStats();
  }, [regionInfo]);

  const fetchCohortStats = async () => {
    setIsLoading(true);
    try {
      // Fetch cohorts
      const { data: cohorts, error: cohortsError } = await supabase
        .from("cohorts")
        .select("id, name, year, cohort_number, is_active")
        .order("year", { ascending: false })
        .order("cohort_number", { ascending: false });

      if (cohortsError) throw cohortsError;

      // Fetch applications with cohort_id
      let appQuery = supabase
        .from("applications")
        .select("cohort_id, status");

      if (regionInfo.hasRestrictions) {
        if (regionInfo.province) {
          appQuery = appQuery.eq("province", regionInfo.province);
        }
        if (regionInfo.country) {
          appQuery = appQuery.eq("country", regionInfo.country);
        }
      }

      const { data: applications, error: appsError } = await appQuery;

      if (appsError) throw appsError;

      // Calculate stats per cohort
      const statsMap = new Map<string, { total: number; pending: number; approved: number; rejected: number }>();

      // Initialize with unassigned
      statsMap.set("unassigned", { total: 0, pending: 0, approved: 0, rejected: 0 });

      // Initialize cohorts
      cohorts?.forEach(cohort => {
        statsMap.set(cohort.id, { total: 0, pending: 0, approved: 0, rejected: 0 });
      });

      // Count applications
      applications?.forEach(app => {
        const cohortId = app.cohort_id || "unassigned";
        const stats = statsMap.get(cohortId) || { total: 0, pending: 0, approved: 0, rejected: 0 };
        stats.total++;
        if (app.status === "pending") stats.pending++;
        else if (app.status === "approved") stats.approved++;
        else if (app.status === "rejected") stats.rejected++;
        statsMap.set(cohortId, stats);
      });

      // Build final stats array
      const cohortStatsArray: CohortStats[] = [];

      // Add cohort stats
      cohorts?.forEach(cohort => {
        const stats = statsMap.get(cohort.id)!;
        cohortStatsArray.push({
          id: cohort.id,
          name: cohort.name,
          year: cohort.year,
          cohort_number: cohort.cohort_number,
          is_active: cohort.is_active,
          ...stats,
        });
      });

      // Add unassigned if there are any
      const unassignedStats = statsMap.get("unassigned")!;
      if (unassignedStats.total > 0) {
        cohortStatsArray.push({
          id: "unassigned",
          name: "Unassigned",
          year: 0,
          cohort_number: 0,
          is_active: false,
          ...unassignedStats,
        });
      }

      setCohortStats(cohortStatsArray);
    } catch (error) {
      console.error("Error fetching cohort stats:", error);
    } finally {
      setIsLoading(false);
    }
  };

  // Prepare chart data
  const barChartData = cohortStats
    .filter(c => c.total > 0)
    .map(cohort => ({
      name: cohort.name.replace("Cohort ", ""),
      total: cohort.total,
      approved: cohort.approved,
      pending: cohort.pending,
      rejected: cohort.rejected,
      isActive: cohort.is_active,
    }));

  const pieChartData = cohortStats
    .filter(c => c.total > 0)
    .map(cohort => ({
      name: cohort.name,
      value: cohort.total,
    }));

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Cohort Statistics
          </CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }

  if (cohortStats.length === 0 || cohortStats.every(c => c.total === 0)) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Cohort Statistics
          </CardTitle>
          <CardDescription>Application distribution across cohorts</CardDescription>
        </CardHeader>
        <CardContent className="text-center py-12 text-muted-foreground">
          <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <p>No cohort data available</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Users className="h-5 w-5" />
          Cohort Statistics
        </CardTitle>
        <CardDescription>Application distribution across cohorts</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Bar Chart - Status Breakdown by Cohort */}
          <div>
            <h4 className="text-sm font-medium mb-4">Status Breakdown by Cohort</h4>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={barChartData} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} />
                  <XAxis type="number" />
                  <YAxis 
                    dataKey="name" 
                    type="category" 
                    width={100}
                    tick={{ fontSize: 12 }}
                  />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: "hsl(var(--background))", 
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "8px"
                    }}
                  />
                  <Legend />
                  <Bar dataKey="approved" stackId="a" fill="hsl(142, 76%, 36%)" name="Approved" />
                  <Bar dataKey="pending" stackId="a" fill="hsl(45, 93%, 47%)" name="Pending" />
                  <Bar dataKey="rejected" stackId="a" fill="hsl(var(--destructive))" name="Rejected" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Pie Chart - Distribution */}
          <div>
            <h4 className="text-sm font-medium mb-4">Application Distribution</h4>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieChartData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name.replace("Cohort ", "")} (${(percent * 100).toFixed(0)}%)`}
                    outerRadius={100}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {pieChartData.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: "hsl(var(--background))", 
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "8px"
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* Stats Summary Table */}
        <div className="mt-6 border rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr>
                <th className="text-left p-3 font-medium">Cohort</th>
                <th className="text-center p-3 font-medium">Total</th>
                <th className="text-center p-3 font-medium">Approved</th>
                <th className="text-center p-3 font-medium">Pending</th>
                <th className="text-center p-3 font-medium">Rejected</th>
                <th className="text-center p-3 font-medium">Approval Rate</th>
              </tr>
            </thead>
            <tbody>
              {cohortStats.filter(c => c.total > 0).map((cohort) => {
                const approvalRate = cohort.total > 0 
                  ? ((cohort.approved / cohort.total) * 100).toFixed(1) 
                  : "0.0";
                return (
                  <tr key={cohort.id} className="border-t">
                    <td className="p-3">
                      <div className="flex items-center gap-2">
                        <span>{cohort.name}</span>
                        {cohort.is_active && (
                          <span className="text-xs bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 px-2 py-0.5 rounded">
                            Active
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="text-center p-3 font-medium">{cohort.total}</td>
                    <td className="text-center p-3 text-green-600">{cohort.approved}</td>
                    <td className="text-center p-3 text-yellow-600">{cohort.pending}</td>
                    <td className="text-center p-3 text-destructive">{cohort.rejected}</td>
                    <td className="text-center p-3">{approvalRate}%</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}
