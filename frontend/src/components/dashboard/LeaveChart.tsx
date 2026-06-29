"use client";

import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { CalendarDays } from "lucide-react";

export default function LeaveChart({ data }: { data: any[] }) {
  const hasLeaves = data.some((d) => d.leaves > 0);

  return (
    <Card className="shadow-sm border">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CalendarDays className="h-5 w-5 text-primary" />
          Leave Usage
        </CardTitle>
        <CardDescription>Leaves taken per month in the current year.</CardDescription>
      </CardHeader>
      <CardContent>
        {!hasLeaves ? (
          <div className="h-[250px] flex items-center justify-center text-sm text-muted-foreground border-2 border-dashed rounded-lg">
            No leaves taken this year yet.
          </div>
        ) : (
          <div className="h-[250px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                <XAxis 
                  dataKey="name" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fontSize: 12, fill: "#64748b" }} 
                  dy={10} 
                />
                <YAxis 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fontSize: 12, fill: "#64748b" }}
                  allowDecimals={false}
                />
                <Tooltip 
                  cursor={{ fill: "#f8fafc" }}
                  contentStyle={{ borderRadius: "8px", border: "1px solid #e2e8f0", boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)" }}
                />
                <Bar 
                  dataKey="leaves" 
                  fill="#3b82f6" 
                  radius={[4, 4, 0, 0]} 
                  barSize={32}
                  animationDuration={1500}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
