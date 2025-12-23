console.log("⏱  Cron Worker Started...");

require("./crons/promoCron");
require("./crons/cleanPaymentsCron");
require("./crons/reminderCron");
