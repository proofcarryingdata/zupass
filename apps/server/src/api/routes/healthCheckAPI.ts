import express, { Request, Response } from "express";
import { Client } from "pg";
import * as TL from "@opentelemetry/api";

export function initHealthcheckRoutes(
  app: express.Application,
  client: Client
): void {
  console.log("Initializing health check routes");

  app.get("/", async (req: Request, res: Response) => {
    res.send("OK!");
    const tracer = TL.trace.getTracer("hello-world-tracer");
    const meter = TL.metrics.getMeter("hello-world-meter");
    const counter = meter.createCounter("sheep");
    counter.add(1);
    const ctx = TL.propagation.setBaggage(
      TL.context.active(),
      TL.propagation.createBaggage({
        for_the_children: { value: "another important value" },
      })
    );
    // within the new context, do some "work"
    await TL.context.with(ctx, async () => {
      await tracer.startActiveSpan("sleep", async (span: TL.Span) => {
        console.log("saying hello to the world");
        span.setAttribute("message", "hello-world");
        span.setAttribute("delay_ms", 100);
        console.log("sleeping a bit!");
        setTimeout(() => {
          span.end();
        }, 100);
      });
    });
  });
}
