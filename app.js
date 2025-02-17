var createError = require("http-errors");
var express = require("express");
var path = require("path");
var cookieParser = require("cookie-parser");
var logger = require("morgan");
var Agenda = require("agenda");
var Agendash = require("agendash");
const axios = require("axios");
require("dotenv").config();

const apiUrl = process.env.API;
var indexRouter = require("./routes/index");

var app = express();

// view engine setup
app.set("views", path.join(__dirname, "views"));
app.set("view engine", "jade");

app.use(logger("dev"));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, "public")));

// Initialize Agenda
var agenda = new Agenda({
  db: { address: "mongodb://127.0.0.1:27017/agenda" },
});

// Function to define a job with a given name and a given function
function defineJob(name, func) {
  agenda.define(name, async (job, done) => {
    console.log(`${name} executed`);
    try {
      const response = await func();
      job.attrs.data = response.data; // Store response data in job attributes
      await job.save(); // Save job attributes
      done();
    } catch (error) {
      job.attrs.data = {
        error: error.response ? error.response.data : error.message,
        noResponse: !error.response,
        timeout: error.code === "ECONNABORTED", // Check if error is a timeout
      }; // Store error and timeout flag in job attributes
      await job.save(); // Save job attributes
      done(error);
    }
  });
}

// Define jobs

// Define a sync service calls from SAP
defineJob("Get service calls from SAP", async () => {
  const url = `${apiUrl}/service-calls/sap/sync/`;
  const response = await axios.get(url, { timeout: 5000 });
  if (!response) {
    throw new Error("No response received from the server");
  }
  console.log(response.data);
  return response;
});

// Define job for sending service calls to mobile app
defineJob("Send service calls to mobile app", async () => {
  const url = `${apiUrl}/service-calls/mobile/sync/`;
  const response = await axios.post(url, { timeout: 5000 });
  if (!response) {
    throw new Error("No response received from the server");
  }
  console.log(response.data);
  return response;
});

// Define job for getting the service calls from the mobile app to the server
defineJob("Get service calls from mobile app", async () => {
  const url = `${apiUrl}/service-calls/server/sync/`;
  const response = await axios.get(url, { timeout: 5000 });
  if (!response) {
    throw new Error("No response received from the server");
  }
  console.log(response.data);
  return response;
});

// Define job for syncing technicians to mobile app
defineJob("Send technicians to mobile app", async () => {
  const url = `${apiUrl}/technicians/mobile/sync/100`;
  const response = await axios.get(url, { timeout: 5000 });
  if (!response) {
    throw new Error("No response received from the server");
  }
  console.log(response.data);
  return response;
});

// Define job for syncing business partners to server
defineJob("Get business partners to server", async () => {
  const url = `${apiUrl}/business-partners/sync/1000`;
  const response = await axios.get(url, { timeout: 5000 });
  if (!response) {
    throw new Error("No response received from the server");
  }
  console.log(response.data);
  return response;
});

// Define job for getting the tabulator data to the server
defineJob("Get tabulator data to server", async () => {
  const url = `${apiUrl}/tabulator/sync/1000`;
  const response = await axios.get(url, { timeout: 5000 });
  if (!response) {
    throw new Error("No response received from the server");
  }
  console.log(response.data);
  return response;
});

// Define job for sending the tabulator data to mobile app
defineJob("Send tabulator data to mobile app", async () => {
  const url = `${apiUrl}/tabulator/mobile/sync/1000`;
  const response = await axios.post(url, { timeout: 5000 });
  if (!response) {
    throw new Error("No response received from the server");
  }
  console.log(response.data);
  return response;
});

// Define job for getting products to server
defineJob("Get products to server", async () => {
  const url = `${apiUrl}/products/sync/1000`;
  const response = await axios.get(url, { timeout: 5000 });
  if (!response) {
    throw new Error("No response received from the server");
  }
  console.log(response.data);
  return response;
});

// Define job for sending the products to mobile app
defineJob("Send products to mobile app", async () => {
  const url = `${apiUrl}/products/mobile/sync/1000`;
  const response = await axios.get(url, { timeout: 5000 }); // Review if change post to get
  if (!response) {
    throw new Error("No response received from the server");
  }
  console.log(response.data);
  return response;
});

// Start Agenda
(async function () {
  await agenda.start();

  // Sync service calls
  await agenda.every("2 minutes", "Get service calls from mobile app");
  await agenda.every("3 minutes", "Get service calls from SAP");

  // Sync technicians and then send new service calls
  await agenda.every("5 minutes", "Send technicians to mobile app");
  agenda.on("success:Send technicians to mobile app", async (job) => {
    console.log(
      "Technicians successfully synced to mobile app, now syncing service calls to mobile app"
    );
    await agenda.now("Send service calls to mobile app");
  });

  // Sync business partners
  await agenda.every("1 hours", "Get business partners to server");

  // Sync products and tabulator data
  await agenda.every("2 hours", "Get products to server");
  await agenda.every("3 hours", "Send products to mobile app");
  await agenda.every("3 hours", "Get tabulator data to server");
  await agenda.every("4 hours", "Send tabulator data to mobile app");

  // Retry on fail
  agenda.on("fail", async (err, job) => {
    console.error(`Job ${job.attrs.name} failed with error: ${err.message}`);
    await job.schedule("in 1 minute").save();
  });
})();

app.use("/", indexRouter);
// Initialize Agendash (Dashboard) after Agenda is connected
app.use("/dash", Agendash(agenda));

// catch 404 and forward to error handler
app.use(function (req, res, next) {
  next(createError(404));
});

// error handler
app.use(function (err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get("env") === "development" ? err : {};

  // render the error page
  res.status(err.status || 500);
  res.render("error");
});

module.exports = app;
