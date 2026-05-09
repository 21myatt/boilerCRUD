import { logger } from "@imsys/utils";
import { emailJob } from "./jobs/email.job";
import { notificationJob } from "./jobs/notification.job";
import { reportJob } from "./jobs/report.job";
import { billingJob } from "./jobs/billing.job";

logger.info("Worker started", {
  jobs: [emailJob(), notificationJob(), reportJob(), billingJob()]
});

