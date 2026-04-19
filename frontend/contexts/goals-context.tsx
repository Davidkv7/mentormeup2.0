"use client";

import React, { createContext, useContext, useState, useEffect, useCallback } from "react";

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
  addGoal: (goal: Omit<Goal, "id" | "createdAt" | "progress" | "phases" | "currentPhase" | "dailyTasks">) => Goal;
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

const createDefaultPhases = (goalTitle: string): GoalPhase[] => [
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
    const storedGoals = localStorage.getItem("mentormeup-goals");
    const storedActiveId = localStorage.getItem("mentormeup-active-goal");
    
    if (storedGoals) {
      try {
        const parsed = JSON.parse(storedGoals);
        setGoals(parsed);
      } catch (e) {
        console.error("Failed to parse stored goals");
      }
    }
    
    if (storedActiveId) {
      setActiveGoalId(storedActiveId);
    }
    
    setIsLoaded(true);
  }, []);

  // Persist to localStorage on changes
  useEffect(() => {
    if (isLoaded) {
      localStorage.setItem("mentormeup-goals", JSON.stringify(goals));
    }
  }, [goals, isLoaded]);

  useEffect(() => {
    if (isLoaded && activeGoalId) {
      localStorage.setItem("mentormeup-active-goal", activeGoalId);
    }
  }, [activeGoalId, isLoaded]);

  const activeGoal = goals.find((g) => g.id === activeGoalId) || null;

  const addGoal = useCallback((goalData: Omit<Goal, "id" | "createdAt" | "progress" | "phases" | "currentPhase" | "dailyTasks">) => {
    const id = `goal-${Date.now()}`;
    const colorIndex = goals.length % GOAL_COLORS.length;
    
    const newGoal: Goal = {
      ...goalData,
      id,
      color: goalData.color || GOAL_COLORS[colorIndex],
      createdAt: new Date().toISOString(),
      progress: 0,
      phases: createDefaultPhases(goalData.title),
      currentPhase: 1,
      dailyTasks: createDefaultTasks(id, goalData.title),
    };

    setGoals((prev) => [...prev, newGoal]);
    
    // If this is the first goal, make it active
    if (goals.length === 0) {
      setActiveGoalId(id);
    }

    return newGoal;
  }, [goals.length]);

  const updateGoal = useCallback((id: string, updates: Partial<Goal>) => {
    setGoals((prev) =>
      prev.map((goal) => (goal.id === id ? { ...goal, ...updates } : goal))
    );
  }, []);

  const deleteGoal = useCallback((id: string) => {
    setGoals((prev) => prev.filter((goal) => goal.id !== id));
    if (activeGoalId === id) {
      const remaining = goals.filter((g) => g.id !== id);
      setActiveGoalId(remaining.length > 0 ? remaining[0].id : null);
    }
  }, [activeGoalId, goals]);

  const setActiveGoal = useCallback((id: string) => {
    setActiveGoalId(id);
  }, []);

  const pauseGoal = useCallback((id: string) => {
    updateGoal(id, { status: "paused" });
  }, [updateGoal]);

  const resumeGoal = useCallback((id: string) => {
    updateGoal(id, { status: "active" });
  }, [updateGoal]);

  const archiveGoal = useCallback((id: string) => {
    updateGoal(id, { status: "archived" });
    if (activeGoalId === id) {
      const activeGoals = goals.filter((g) => g.id !== id && g.status === "active");
      setActiveGoalId(activeGoals.length > 0 ? activeGoals[0].id : null);
    }
  }, [updateGoal, activeGoalId, goals]);

  const completeTask = useCallback((goalId: string, taskId: string) => {
    setGoals((prev) =>
      prev.map((goal) => {
        if (goal.id !== goalId) return goal;
        const updatedTasks = goal.dailyTasks.map((task) =>
          task.id === taskId ? { ...task, completed: !task.completed } : task
        );
        const completedCount = updatedTasks.filter((t) => t.completed).length;
        const newProgress = Math.round((completedCount / updatedTasks.length) * 100);
        return { ...goal, dailyTasks: updatedTasks, progress: newProgress };
      })
    );
  }, []);

  const getGoalById = useCallback((id: string) => {
    return goals.find((g) => g.id === id);
  }, [goals]);

  return (
    <GoalsContext.Provider
      value={{
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
      }}
    >
      {children}
    </GoalsContext.Provider>
  );
}

export function useGoals() {
  const context = useContext(GoalsContext);
  if (context === undefined) {
    throw new Error("useGoals must be used within a GoalsProvider");
  }
  return context;
}
