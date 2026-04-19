"use client";

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { api, type ApiGoal, type ApiGoalPhase, type ApiGoalTask } from "@/lib/api";
import { useAuth } from "@/contexts/auth-context";

export type GoalColor = "gold" | "cyan" | "purple" | "green" | "red";
export type GoalStatus = "active" | "paused" | "completed" | "archived";

// Re-exported under the legacy names so existing UI keeps working unchanged.
export interface GoalPhase extends ApiGoalPhase {}
export interface GoalTask {
  id: string;
  title: string;
  duration: string;
  completed: boolean;
  goalId: string;
}

export interface Goal {
  id: string;
  title: string;
  description?: string;
  color: GoalColor;
  status: GoalStatus;
  progress: number;
  createdAt: string;
  phases: GoalPhase[];
  currentPhase: number;
  dailyTasks: GoalTask[];
}

interface GoalsContextType {
  goals: Goal[];
  activeGoalId: string | null;
  activeGoal: Goal | null;
  loading: boolean;
  addGoal: (goal: {
    title: string;
    description?: string;
    color?: GoalColor;
    status?: GoalStatus;
  }) => Promise<Goal>;
  updateGoal: (id: string, updates: Partial<Omit<Goal, "id" | "createdAt">>) => Promise<void>;
  deleteGoal: (id: string) => Promise<void>;
  setActiveGoal: (id: string | null) => void;
  pauseGoal: (id: string) => Promise<void>;
  resumeGoal: (id: string) => Promise<void>;
  archiveGoal: (id: string) => Promise<void>;
  completeTask: (goalId: string, taskId: string) => Promise<void>;
  getGoalById: (id: string) => Goal | undefined;
  refresh: () => Promise<void>;
}

const GoalsContext = createContext<GoalsContextType | undefined>(undefined);
const ACTIVE_GOAL_STORAGE_KEY = "mentormeup-active-goal";

function toGoal(api: ApiGoal): Goal {
  return {
    id: api.goal_id,
    title: api.title,
    description: api.description ?? undefined,
    color: api.color,
    status: api.status,
    progress: api.progress,
    createdAt: api.created_at,
    phases: api.phases,
    currentPhase: api.current_phase,
    dailyTasks: api.daily_tasks.map((t: ApiGoalTask) => ({
      id: t.id,
      title: t.title,
      duration: t.duration,
      completed: t.completed,
      goalId: t.goal_id,
    })),
  };
}

export function GoalsProvider({ children }: { children: React.ReactNode }) {
  const { status } = useAuth();
  const [goals, setGoals] = useState<Goal[]>([]);
  const [activeGoalId, setActiveGoalId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(async () => {
    if (status !== "authenticated") return;
    setLoading(true);
    try {
      const list = await api.get<ApiGoal[]>("/api/goals");
      setGoals(list.map(toGoal));
    } finally {
      setLoading(false);
    }
  }, [status]);

  useEffect(() => {
    if (status === "authenticated") {
      void refresh();
      const stored = typeof window !== "undefined" ? localStorage.getItem(ACTIVE_GOAL_STORAGE_KEY) : null;
      if (stored) setActiveGoalId(stored);
    } else if (status === "anonymous") {
      setGoals([]);
      setActiveGoalId(null);
    }
  }, [status, refresh]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (activeGoalId) {
      localStorage.setItem(ACTIVE_GOAL_STORAGE_KEY, activeGoalId);
    } else {
      localStorage.removeItem(ACTIVE_GOAL_STORAGE_KEY);
    }
  }, [activeGoalId]);

  const activeGoal = useMemo(
    () => goals.find((g) => g.id === activeGoalId) ?? null,
    [goals, activeGoalId],
  );

  const addGoal = useCallback<GoalsContextType["addGoal"]>(
    async ({ title, description, color }) => {
      const created = await api.post<ApiGoal>("/api/goals", {
        title,
        description,
        color: color ?? "gold",
      });
      const next = toGoal(created);
      setGoals((prev) => {
        if (prev.length === 0) setActiveGoalId(next.id);
        return [...prev, next];
      });
      return next;
    },
    [],
  );

  const updateGoal = useCallback<GoalsContextType["updateGoal"]>(async (id, updates) => {
    const body: Record<string, unknown> = {};
    if (updates.title !== undefined) body.title = updates.title;
    if (updates.description !== undefined) body.description = updates.description;
    if (updates.status !== undefined) body.status = updates.status;
    if (updates.progress !== undefined) body.progress = updates.progress;
    if (updates.currentPhase !== undefined) body.current_phase = updates.currentPhase;
    const updated = await api.patch<ApiGoal>(`/api/goals/${id}`, body);
    const next = toGoal(updated);
    setGoals((prev) => prev.map((g) => (g.id === id ? next : g)));
  }, []);

  const deleteGoal = useCallback<GoalsContextType["deleteGoal"]>(async (id) => {
    await api.delete(`/api/goals/${id}`);
    setGoals((prev) => {
      const remaining = prev.filter((g) => g.id !== id);
      setActiveGoalId((current) => {
        if (current !== id) return current;
        return remaining.length ? remaining[0].id : null;
      });
      return remaining;
    });
  }, []);

  const setActiveGoal = useCallback<GoalsContextType["setActiveGoal"]>((id) => {
    setActiveGoalId(id);
  }, []);

  const pauseGoal = useCallback<GoalsContextType["pauseGoal"]>(
    (id) => updateGoal(id, { status: "paused" }),
    [updateGoal],
  );

  const resumeGoal = useCallback<GoalsContextType["resumeGoal"]>(
    (id) => updateGoal(id, { status: "active" }),
    [updateGoal],
  );

  const archiveGoal = useCallback<GoalsContextType["archiveGoal"]>(
    async (id) => {
      await updateGoal(id, { status: "archived" });
      setActiveGoalId((current) => {
        if (current !== id) return current;
        const fallback = goals.find((g) => g.id !== id && g.status === "active");
        return fallback ? fallback.id : null;
      });
    },
    [updateGoal, goals],
  );

  const completeTask = useCallback<GoalsContextType["completeTask"]>(async (goalId, taskId) => {
    const updated = await api.post<ApiGoal>(`/api/goals/${goalId}/tasks/${taskId}/toggle`);
    const next = toGoal(updated);
    setGoals((prev) => prev.map((g) => (g.id === goalId ? next : g)));
  }, []);

  const getGoalById = useCallback<GoalsContextType["getGoalById"]>(
    (id) => goals.find((g) => g.id === id),
    [goals],
  );

  const value = useMemo<GoalsContextType>(
    () => ({
      goals,
      activeGoalId,
      activeGoal,
      loading,
      addGoal,
      updateGoal,
      deleteGoal,
      setActiveGoal,
      pauseGoal,
      resumeGoal,
      archiveGoal,
      completeTask,
      getGoalById,
      refresh,
    }),
    [
      goals,
      activeGoalId,
      activeGoal,
      loading,
      addGoal,
      updateGoal,
      deleteGoal,
      setActiveGoal,
      pauseGoal,
      resumeGoal,
      archiveGoal,
      completeTask,
      getGoalById,
      refresh,
    ],
  );

  return <GoalsContext.Provider value={value}>{children}</GoalsContext.Provider>;
}

export function useGoals() {
  const context = useContext(GoalsContext);
  if (context === undefined) {
    throw new Error("useGoals must be used within a GoalsProvider");
  }
  return context;
}
