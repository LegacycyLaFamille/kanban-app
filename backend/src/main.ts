import express, { type Express, type Request, type Response } from "express";
import dotenv from "dotenv";

const app: Express = express();
const port = 3000;

dotenv.config();
app.use(express.json());

app.get("/", (_req: Request, res: Response) => {
  res.send("Hello World!");
});

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`);
});
