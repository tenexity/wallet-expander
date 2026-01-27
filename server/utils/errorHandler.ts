import { Response } from "express";
import { z } from "zod";

export function handleRouteError(
  error: unknown,
  res: Response,
  context: string
): void {
  if (error instanceof z.ZodError) {
    res.status(400).json({ 
      message: "Invalid data", 
      errors: error.errors 
    });
    return;
  }

  console.error(`${context}:`, error);
  res.status(500).json({ 
    message: `Failed to ${context.toLowerCase().replace(/ error$/, "")}` 
  });
}
