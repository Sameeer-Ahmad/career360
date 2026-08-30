"use client";

import { useState } from "react";
import { Briefcase, Plus } from "lucide-react";
import { Header } from "@/components/shell/header";
import { Button } from "@/components/ui/button";
import { IconButton } from "@/components/ui/icon-button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge, PriorityBadge, StatusBadge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Divider } from "@/components/ui/divider";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { buttonVariants } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Tooltip } from "@/components/ui/tooltip";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Pagination } from "@/components/ui/pagination";
import { StatCard } from "@/components/ui/stat-card";
import { EmptyState } from "@/components/ui/empty-state";
import { LoadingState } from "@/components/ui/loading-state";
import { ErrorState } from "@/components/ui/error-state";
import { Skeleton } from "@/components/ui/skeleton";

const STATUSES = ["WISHLIST", "APPLIED", "SCREENING", "INTERVIEW", "OFFER", "ACCEPTED", "REJECTED"] as const;
const PRIORITIES = ["LOW", "MEDIUM", "HIGH"] as const;

export default function ShowcasePage() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [switchOn, setSwitchOn] = useState(true);
  const [page, setPage] = useState(1);

  return (
    <>
      <Header title="UI Showcase" />
      <main className="flex-1 space-y-8 p-4 md:p-6">
        <p className="text-sm text-muted-foreground">
          Internal, development-only page for inspecting design-system components in both themes.
          Not part of the product navigation.
        </p>

        <section className="space-y-3">
          <h2 className="text-lg font-semibold">Buttons</h2>
          <Card>
            <CardContent className="flex flex-wrap items-center gap-2 p-5">
              <Button variant="primary">Primary</Button>
              <Button variant="secondary">Secondary</Button>
              <Button variant="outline">Outline</Button>
              <Button variant="ghost">Ghost</Button>
              <Button variant="destructive">Destructive</Button>
              <Button variant="primary" disabled>
                Disabled
              </Button>
            </CardContent>
            <CardContent className="flex flex-wrap items-center gap-2 p-5 pt-0">
              <Button size="sm">Small</Button>
              <Button size="md">Medium</Button>
              <Button size="lg">Large</Button>
              <IconButton aria-label="Add application">
                <Plus />
              </IconButton>
            </CardContent>
          </Card>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-semibold">Badges</h2>
          <Card>
            <CardContent className="flex flex-wrap items-center gap-2 p-5">
              {STATUSES.map((s) => (
                <StatusBadge key={s} status={s} />
              ))}
            </CardContent>
            <CardContent className="flex flex-wrap items-center gap-2 p-5 pt-0">
              {PRIORITIES.map((p) => (
                <PriorityBadge key={p} priority={p} />
              ))}
              <Badge variant="neutral">Neutral</Badge>
              <Badge variant="primary">Primary</Badge>
            </CardContent>
          </Card>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-semibold">Cards & stat cards</h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard label="Total Applications" value={24} icon={Briefcase} trend="+3 this week" />
            <Card>
              <CardHeader>
                <CardTitle>Card title</CardTitle>
                <CardDescription>Card description text.</CardDescription>
              </CardHeader>
              <CardContent>Card content area.</CardContent>
            </Card>
          </div>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-semibold">Form primitives</h2>
          <Card>
            <CardContent className="grid grid-cols-1 gap-4 p-5 md:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="showcase-input">Job title</Label>
                <Input id="showcase-input" placeholder="Senior Frontend Engineer" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="showcase-select">Status</Label>
                <Select id="showcase-select" defaultValue="WISHLIST">
                  {STATUSES.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </Select>
              </div>
              <div className="space-y-1.5 md:col-span-2">
                <Label htmlFor="showcase-textarea">Job description</Label>
                <Textarea id="showcase-textarea" placeholder="Paste the job description…" />
              </div>
              <div className="flex items-center gap-2">
                <Checkbox id="showcase-checkbox" defaultChecked />
                <Label htmlFor="showcase-checkbox">Remote only</Label>
              </div>
              <div className="flex items-center gap-2">
                <Switch checked={switchOn} onCheckedChange={setSwitchOn} aria-label="Email notifications" />
                <Label>Email notifications</Label>
              </div>
            </CardContent>
          </Card>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-semibold">Overlays</h2>
          <Card>
            <CardContent className="flex flex-wrap items-center gap-3 p-5">
              <Button onClick={() => setDialogOpen(true)}>Open dialog</Button>
              <Dialog
                open={dialogOpen}
                onClose={() => setDialogOpen(false)}
                title="Example dialog"
                description="A minimal, accessible modal primitive."
              >
                <p className="text-sm text-muted-foreground">
                  Focus is trapped, Escape closes it, and focus returns to the trigger on close.
                </p>
                <div className="mt-4 flex justify-end gap-2">
                  <Button variant="outline" size="sm" onClick={() => setDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button size="sm" onClick={() => setDialogOpen(false)}>
                    Confirm
                  </Button>
                </div>
              </Dialog>

              <DropdownMenu>
                <DropdownMenuTrigger className={buttonVariants("outline", "md")}>
                  Open menu
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                  <DropdownMenuItem>Edit</DropdownMenuItem>
                  <DropdownMenuItem>Duplicate</DropdownMenuItem>
                  <DropdownMenuItem className="text-destructive">Delete</DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

              <Tooltip content="This is a tooltip">
                <Button variant="ghost">Hover me</Button>
              </Tooltip>
            </CardContent>
          </Card>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-semibold">Tabs</h2>
          <Card>
            <CardContent className="p-5">
              <Tabs defaultValue="overview">
                <TabsList>
                  <TabsTrigger value="overview">Overview</TabsTrigger>
                  <TabsTrigger value="details">Details</TabsTrigger>
                </TabsList>
                <TabsContent value="overview">Overview tab content.</TabsContent>
                <TabsContent value="details">Details tab content.</TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-semibold">Table & pagination</h2>
          <TableContainer>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Company</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <TableRow>
                  <TableCell>Acme Corp</TableCell>
                  <TableCell>
                    <StatusBadge status="INTERVIEW" />
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </TableContainer>
          <Pagination page={page} pageCount={5} onPageChange={setPage} />
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-semibold">States</h2>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <Card>
              <EmptyState icon={Briefcase} title="No applications yet" description="Add your first one." />
            </Card>
            <Card>
              <LoadingState />
            </Card>
            <Card>
              <ErrorState description="Could not load data." onRetry={() => {}} />
            </Card>
          </div>
          <div className="flex items-center gap-3">
            <Skeleton className="h-9 w-32" />
            <Skeleton className="size-9 rounded-full" />
          </div>
        </section>

        <Divider />
      </main>
    </>
  );
}
