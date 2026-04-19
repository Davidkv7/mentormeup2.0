"use client";

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

export interface GoalPhase {
  id: string;
  title: string;
  milestones: {
    id: string;
    title: string;
    status: "complete" | "active" | "locked";
  }[];
}

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
  color: "gold" | "cyan" | "purple" | "green" | "red";
  status: "active" | "paused" | "completed" | "archived";
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
  addGoal: (
    goal: Omit<
      Goal,
      "id" | "createdAt" | "progress" | "phases" | "currentPhase" | "dailyTasks"
    >,
  ) => Goal;
  updateGoal: (id: string, updates: Partial<Goal>) => void;
  deleteGoal: (id: string) => void;
  setActiveGoal: (id: string) => void;
  pauseGoal: (id: string) => void;
  resumeGoal: (id: string) => void;
  archiveGoal: (id: string) => void;
  completeTask: (goalId: string, taskId: string) => void;
  getGoalById: (id: string) => Goal | undefined;
}

const GoalsContext = createContext<GoalsContextType | undefined>(undefined);

const GOAL_COLORS: Goal["color"][] = ["gold", "cyan", "purple", "green", "red"];
const GOALS_STORAGE_KEY = "mentormeup-goals";
const ACTIVE_GOAL_STORAGE_KEY = "mentormeup-active-goal";

const createDefaultPhases = (_goalTitle: string): GoalPhase[] => [
  {
    id: "phase-1",
    title: "Foundation & Clarity",
    milestones: [
      { id: "m1-1", title: "Define success metrics", status: "active" },
      { id: "m1-2", title: "Identify current baseline", status: "locked" },
      { id: "m1-3", title: "Set first milestone target", status: "locked" },
    ],
  },
  {
    id: "phase-2",
    title: "Build Momentum",
    milestones: [
      { id: "m2-1", title: "Establish daily habits", status: "locked" },
      { id: "m2-2", title: "Track progress for 2 weeks", status: "locked" },
      { id: "m2-3", title: "First progress review", status: "locked" },
    ],
  },
  {
    id: "phase-3",
    title: "Accelerate & Refine",
    milestones: [
      { id: "m3-1", title: "Optimize approach", status: "locked" },
      { id: "m3-2", title: "Push toward final goal", status: "locked" },
      { id: "m3-3", title: "Celebrate completion", status: "locked" },
    ],
  },
];

const createDefaultTasks = (goalId: string, goalTitle: string): GoalTask[] => [
  {
    id: `${goalId}-task-1`,
    title: `Review ${goalTitle} progress`,
    duration: "5 min",
    completed: false,
    goalId,
  },
  {
    id: `${goalId}-task-2`,
    title: `Work on ${goalTitle}`,
    duration: "30 min",
    completed: false,
    goalId,
  },
];

export function GoalsProvider({ children }: { children: React.ReactNode }) {
  const [goals, setGoals] = useState<Goal[]>([]);
  const [activeGoalId, setActiveGoalId] = useState<string | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);

  // Load from localStorage on mount
  useEffect(() => {
    const storedGoals = localStorage.getItem(GOALS_STORAGE_KEY);
    const storedActiveId = localStorage.getItem(ACTIVE_GOAL_STORAGE_KEY);

    if (storedGoals) {
      try {
        const parsed = JSON.parse(storedGoals);
        setGoals(parsed);
      } catch {
        // Corrupt entry — reset silently; user-visible errors would be noise.
      }
    }

    if (storedActiveId) {
      setActiveGoalId(storedActiveId);
    }

    setIsLoaded(true);
  }, []);

  // Persist to localStorage on changes
  useEffect(() => {
    if (!isLoaded) return;
    localStorage.setItem(GOALS_STORAGE_KEY, JSON.stringify(goals));
  }, [goals, isLoaded]);

  useEffect(() => {
    if (!isLoaded) return;
    if (activeGoalId) {
      localStorage.setItem(ACTIVE_GOAL_STORAGE_KEY, activeGoalId);
    } else {
      localStorage.removeItem(ACTIVE_GOAL_STORAGE_KEY);
    }
  }, [activeGoalId, isLoaded]);

  const activeGoal = useMemo(
    () => goals.find((g) => g.id === activeGoalId) || null,
    [goals, activeGoalId],
  );

  const addGoal = useCallback<GoalsContextType["addGoal"]>((goalData) => {
    const id = `goal-${Date.now()}`;
    // Declare outside the setter so we can return it synchronously.
    let newGoal!: Goal;
    setGoals((prev) => {
      const colorIndex = prev.length % GOAL_COLORS.length;
      newGoal = {
        ...goalData,
        id,
        color: goalData.color || GOAL_COLORS[colorIndex],
        createdAt: new Date().toISOString(),
        progress: 0,
        phases: createDefaultPhases(goalData.title),
        currentPhase: 1,
        dailyTasks: createDefaultTasks(id, goalData.title),
      };
      // Promote first goal to active inside the updater to avoid stale reads.
      if (prev.length === 0) {
        setActiveGoalId(id);
      }
      return [...prev, newGoal];
    });
    return newGoal;
  }, []);

  const updateGoal = useCallback<GoalsContextType["updateGoal"]>(
    (id, updates) => {
      setGoals((prev) =>
        prev.map((goal) => (goal.id === id ? { ...goal, ...updates } : goal)),
      );
    },
    [],
  );

  const deleteGoal = useCallback<GoalsContextType["deleteGoal"]>((id) => {
    setGoals((prev) => {
      const remaining = prev.filter((goal) => goal.id !== id);
      setActiveGoalId((currentActive) => {
        if (currentActive !== id) return currentActive;
        return remaining.length > 0 ? remaining[0].id : null;
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

  const archiveGoal = useCallback<GoalsContextType["archiveGoal"]>((id) => {
    setGoals((prev) => {
      const next = prev.map((goal) =>
        goal.id === id ? { ...goal, status: "archived" as const } : goal,
      );
      setActiveGoalId((currentActive) => {
        if (currentActive !== id) return currentActive;
        const fallback = next.find(
          (g) => g.id !== id && g.status === "active",
        );
        return fallback ? fallback.id : null;
      });
      return next;
    });
  }, []);

  const completeTask = useCallback<GoalsContextType["completeTask"]>(
    (goalId, taskId) => {
      setGoals((prev) =>
        prev.map((goal) => {
          if (goal.id !== goalId) return goal;
          const updatedTasks = goal.dailyTasks.map((task) =>
            task.id === taskId ? { ...task, completed: !task.completed } : task,
          );
          const completedCount = updatedTasks.filter((t) => t.completed).length;
          const newProgress = updatedTasks.length
            ? Math.round((completedCount / updatedTasks.length) * 100)
            : 0;
          return { ...goal, dailyTasks: updatedTasks, progress: newProgress };
        }),
      );
    },
    [],
  );

  const getGoalById = useCallback<GoalsContextType["getGoalById"]>(
    (id) => goals.find((g) => g.id === id),
    [goals],
  );

  const value = useMemo<GoalsContextType>(
    () => ({
      goals,
      activeGoalId,
      activeGoal,
      addGoal,
      updateGoal,
      deleteGoal,
      setActiveGoal,
      pauseGoal,
      resumeGoal,
      archiveGoal,
      completeTask,
      getGoalById,
    }),
    [
      goals,
      activeGoalId,
      activeGoal,
      addGoal,
      updateGoal,
      deleteGoal,
      setActiveGoal,
      pauseGoal,
      resumeGoal,
      archiveGoal,
      completeTask,
      getGoalById,
    ],
  );

  return (
    <GoalsContext.Provider value={value}>{children}</GoalsContext.Provider>
  );
}

export function useGoals() {
  const context = useContext(GoalsContext);
  if (context === undefined) {
    throw new Error("useGoals must be used within a GoalsProvider");
  }
  return context;
}
