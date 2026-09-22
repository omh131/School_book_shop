import { Router, type IRouter } from "express";
import healthRouter from "./health";
import booksRouter from "./books";
import ordersRouter from "./orders";
import usersRouter from "./users";
import bookAdminRouter from "./book-admin";
import bookRequestsRouter from "./book-requests";

const router: IRouter = Router();

router.use(healthRouter);
router.use(booksRouter);
router.use(ordersRouter);
router.use(usersRouter);
router.use(bookAdminRouter);
router.use(bookRequestsRouter);

export default router;
