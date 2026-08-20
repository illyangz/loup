import { Router, type IRouter } from "express";
import healthRouter from "./health";
import homeRouter from "./home";
import catalogRouter from "./catalog";
import householdRouter from "./household";
import bookingsRouter from "./bookings";
import billingRouter from "./billing";
import packRouter from "./pack";
import pushRouter from "./push";
import platformRouter from "./platform";
import adminRouter from "./admin";
import providerRouter from "./provider";
import webhooksRouter from "./webhooks";
import ssoRouter from "./sso";
import widgetRouter from "./widget";
import openaiRouter from "./openai/index";

const router: IRouter = Router();

router.use(healthRouter);
router.use(ssoRouter);
router.use(widgetRouter);
router.use(homeRouter);
router.use(catalogRouter);
router.use(householdRouter);
router.use(bookingsRouter);
router.use(billingRouter);
router.use(packRouter);
router.use(pushRouter);
router.use(platformRouter);
router.use(providerRouter);
router.use(adminRouter);
router.use(webhooksRouter);
router.use(providerRouter);
router.use(openaiRouter);

export default router;
