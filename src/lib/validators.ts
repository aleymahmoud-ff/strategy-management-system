import { z } from "zod";

export const loginSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(1, "Password is required"),
});

export const userCreateSchema = z.object({
  email: z.string().email(),
  name: z.string().min(1, "Name is required"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  role: z.enum(["FUNCTION_HEAD", "STRATEGY_MANAGER", "EXECUTIVE"]),
  departmentId: z.string().nullable().optional(),
});

export const userUpdateSchema = z.object({
  email: z.string().email().optional(),
  name: z.string().min(1).optional(),
  password: z.string().min(6).optional(),
  role: z.enum(["FUNCTION_HEAD", "STRATEGY_MANAGER", "EXECUTIVE"]).optional(),
  departmentId: z.string().nullable().optional(),
});

export const saveDraftSchema = z.object({
  objectives: z.array(
    z.object({
      objectiveId: z.string(),
      achievedValue: z.string(),
      note: z.string(),
    })
  ),
  actions: z.array(
    z.object({
      keyActionId: z.string(),
      status: z.enum([
        "COMPLETE",
        "ON_TRACK",
        "AT_RISK",
        "NOT_STARTED",
        "BLOCKED",
        "DEFERRED",
      ]),
      progress: z.string(),
      nextPriority: z.string(),
      blockers: z.string(),
    })
  ),
});
