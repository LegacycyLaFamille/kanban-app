import express, { type Express, type Request, type Response } from "express";
import dotenv from "dotenv";
import legacy from "./legacy/index.js";

const app: Express = express();
const port = process.env.PORT || 3000;

dotenv.config();
app.use(express.json());

app.use("/api/legacy", legacy as any);

app.get("/", (_req: Request, res: Response) => {
  res.send("Hello from ts backend");
});

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`);
});
