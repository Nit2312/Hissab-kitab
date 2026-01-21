"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from "recharts"

const data = [
  { name: "Food", value: 4500, color: "hsl(var(--chart-1))" },
  { name: "Travel", value: 3200, color: "hsl(var(--chart-2))" },
  { name: "Shopping", value: 2100, color: "hsl(var(--chart-3))" },
  { name: "Rent", value: 1800, color: "hsl(var(--chart-4))" },
  { name: "Others", value: 740, color: "hsl(var(--chart-5))" },
]

export function ExpenseChart() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Category-wise Expenses</CardTitle>
        <CardDescription>Your spending breakdown this month</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="h-[280px]">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={100}
                paddingAngle={2}
                dataKey="value"
              >
                {data.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip
                formatter={(value: number) => [`₹${value.toLocaleString("en-IN")}`, "Amount"]}
                contentStyle={{
                  backgroundColor: "hsl(var(--card))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: "8px",
                }}
              />
              <Legend
                formatter={(value) => (
                  <span className="text-sm text-foreground">{value}</span>
                )}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  )
}
