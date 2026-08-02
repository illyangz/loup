import { Router, type IRouter } from "express";
import healthRouter from "./health";
import homeRouter from "./home";
import catalogRouter from "./catalog";
import householdRouter from "./household";
import bookingsRouter from "./bookings";
import billingRouter from "./billing";
import packRouter from "./pack";
import pushRouter from "./push";

const router: IRouter = Router();

router.use(healthRouter);
router.use(homeRouter);
router.use(catalogRouter);
router.use(householdRouter);
router.use(bookingsRouter);
router.use(billingRouter);
router.use(packRouter);
router.use(pushRouter);

export default router;
