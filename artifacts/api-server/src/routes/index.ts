import { Router, type IRouter } from "express";
import healthRouter from "./health";
import anchorRouter from "./anchor";

const router: IRouter = Router();

router.use(healthRouter);
router.use(anchorRouter);

export default router;
