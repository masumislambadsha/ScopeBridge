"use client";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { DndContext, useSensor, useSensors, PointerSensor, DragEndEvent } from "@dnd-kit/core";
import { toast } from "sonner";
import { api, ApiError } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input, Label, Select } from "@/components/ui/input";
import { ListSkeleton, EmptyState, ErrorState } from "@/components/ui/states";
import { Dialog } from "@/components/ui/dialog";

const COLS = ["TODO", "IN_PROGRESS", "REVIEW", "COMPLETED"] as const;

export function TasksTab({ projectId }: { projectId: string }) {
  const qc = useQueryClient();
  const [view, setView] = useState<"board" | "list">("board");
  const [status, setStatus] = useState("");
  const [showGen, setShowGen] = useState(false);
  const [onlyNew, setOnlyNew] = useState(false);
  const [preview, setPreview] = useState<any[] | null>(null);
  const [previewVersion, setPreviewVersion] = useState("");

  const tasks = useQuery({
    queryKey: ["tasks", projectId, status],
    queryFn: () => api.get<any[]>(`/api/tasks?projectId=${projectId}&limit=100${status ? `&status=${status}` : ""}`).then((r) => r.data),
  });
  const versions = useQuery({
    queryKey: ["scope-versions", projectId, "approved"],
    queryFn: async () => {
      const scopes = await api.get<any[]>(`/api/scopes?projectId=${projectId}`).then((r) => r.data);
      const s = scopes[0];
      if (!s) return [];
      const full = await api.get<any>(`/api/scopes/${s.id}`).then((r) => r.data);
      return (full.versions ?? []).filter((v: any) => v.status === "APPROVED");
    },
  });

  const inv = () => {
    void qc.invalidateQueries({ queryKey: ["tasks", projectId] });
    void qc.invalidateQueries({ queryKey: ["traceability", projectId] });
  };
  const move = useMutation({
    mutationFn: ({ id, to }: { id: string; to: string }) => api.patch(`/api/tasks/${id}`, { status: to }),
    onSuccess: () => {
      toast.success("Task updated");
      inv();
    },
    onError: (e) => toast.error(e instanceof ApiError ? e.message : "Update failed"),
  });
  const previewGen = useMutation({
    mutationFn: ({ versionId, only }: { versionId: string; only: boolean }) =>
      api.get<any>(`/api/scope-versions/${versionId}/generate-tasks?onlyNew=${only}`).then((r) => ({ ...r.data, versionId })),
    onSuccess: (d) => {
      setPreview(d.preview);
      setPreviewVersion(d.versionId);
    },
    onError: (e) => toast.error(e instanceof ApiError ? e.message : "Preview failed"),
  });
  const confirmBulk = useMutation({
    mutationFn: (items: any[]) => api.post(`/api/projects/${projectId}/tasks/bulk`, { scopeVersionId: previewVersion, tasks: items }),
    onSuccess: (r: any) => {
      toast.success(`${r.data.length} tasks created`);
      setPreview(null);
      setShowGen(false);
      inv();
    },
    onError: (e) => toast.error(e instanceof ApiError ? e.message : "Bulk create failed"),
  });

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));
  function onDragEnd(ev: DragEndEvent) {
    const id = String(ev.active.id);
    const to = ev.over?.id ? String(ev.over.id) : null;
    if (to && (COLS as readonly string[]).includes(to)) move.mutate({ id, to });
  }

  return (
    <div className="grid gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <Button size="sm" variant={view === "board" ? "default" : "outline"} onClick={() => setView("board")}>Board</Button>
        <Button size="sm" variant={view === "list" ? "default" : "outline"} onClick={() => setView("list")}>List</Button>
        <Select aria-label="Status filter" value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="">All statuses</option>
          {COLS.map((c) => <option key={c} value={c}>{c}</option>)}
        </Select>
        <Button size="sm" variant="outline" onClick={() => setShowGen(true)}>Generate from approved scope</Button>
      </div>
      {tasks.isLoading && <ListSkeleton />}
      {tasks.error && <ErrorState message="Could not load tasks." onRetry={() => tasks.refetch()} />}
      {tasks.data && tasks.data.length === 0 && <EmptyState title="No tasks" hint="Generate them from an approved scope version." />}
      {view === "board" && tasks.data && (
        <DndContext sensors={sensors} onDragEnd={onDragEnd}>
          <div className="flex gap-2 overflow-x-auto pb-2">
            {COLS.map((c) => (
              <Column key={c} id={c} tasks={tasks.data.filter((t: any) => t.status === c)} onMove={(id, to) => move.mutate({ id, to })} />
            ))}
          </div>
        </DndContext>
      )}
      {view === "list" && tasks.data && (
        <div className="grid gap-1">
          {tasks.data.map((t: any) => (
            <Card key={t.id}>
              <CardContent className="flex flex-col gap-1 sm:flex-row sm:items-center">
                <div className="flex-1">
                  <p className="font-medium"><span className="font-mono text-xs text-zinc-500">{t.code}</span> {t.title}</p>
                  <p className="text-xs text-zinc-500">{t.requirement ? `${t.requirement.code} · ` : ""}{t.assignee?.name ?? "unassigned"} · {t.priority}</p>
                </div>
                <Select aria-label="Move task" value={t.status} onChange={(e) => move.mutate({ id: t.id, to: e.target.value })}>
                  {COLS.map((c) => <option key={c} value={c}>{c}</option>)}
                </Select>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
      <Dialog open={showGen} onClose={() => { setShowGen(false); setPreview(null); }} title="Generate tasks from approved scope" wide>
        <div className="grid gap-2">
          <div className="flex flex-wrap items-center gap-2 text-sm">
            {(versions.data ?? []).length === 0 && <p className="text-zinc-500">No approved version yet.</p>}
            {(versions.data ?? []).map((v: any) => (
              <Button key={v.id} size="sm" variant="outline" onClick={() => previewGen.mutate({ versionId: v.id, only: onlyNew })}>
                Preview from v{v.version}
              </Button>
            ))}
            <label className="flex items-center gap-1 text-xs"><input type="checkbox" checked={onlyNew} onChange={(e) => setOnlyNew(e.target.checked)} /> only new features</label>
          </div>
          {preview && (
            <>
              <p className="text-sm text-zinc-600">{preview.length} proposed tasks. Edit titles below, then confirm.</p>
              {preview.map((t, i) => (
                <div key={i} className="grid gap-1 rounded border p-2">
                  <Label>Title</Label>
                  <Input value={t.title} onChange={(e) => setPreview(preview.map((x, j) => j === i ? { ...x, title: e.target.value } : x))} />
                  <p className="whitespace-pre-wrap text-xs text-zinc-500">{t.description}</p>
                </div>
              ))}
              <Button disabled={preview.length === 0 || confirmBulk.isPending} onClick={() => confirmBulk.mutate(preview)}>Confirm + create {preview.length} tasks</Button>
            </>
          )}
        </div>
      </Dialog>
    </div>
  );
}

import { useDraggable, useDroppable } from "@dnd-kit/core";

function Column({ id, tasks, onMove }: { id: string; tasks: any[]; onMove: (id: string, to: string) => void }) {
  const { setNodeRef } = useDroppable({ id });
  return (
    <div ref={setNodeRef} className="w-64 shrink-0 rounded-lg border bg-zinc-50 p-2">
      <p className="mb-1 px-1 text-xs font-semibold text-zinc-600">{id} ({tasks.length})</p>
      <div className="grid gap-1">
        {tasks.map((t: any) => (
          <DraggableTask key={t.id} task={t} onMove={(to) => onMove(t.id, to)} />
        ))}
      </div>
    </div>
  );
}

function DraggableTask({ task }: { task: any; onMove: (to: string) => void }) {
  const { attributes, listeners, setNodeRef, transform } = useDraggable({ id: task.id });
  return (
    <div
      ref={setNodeRef}
      style={transform ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)` } : undefined}
      {...listeners}
      {...attributes}
      className="cursor-grab rounded border bg-white p-2 text-sm active:cursor-grabbing"
    >
      <p className="font-medium"><span className="font-mono text-xs text-zinc-500">{task.code}</span> {task.title}</p>
      <p className="text-xs text-zinc-500">{task.assignee?.name ?? "unassigned"}</p>
    </div>
  );
}
