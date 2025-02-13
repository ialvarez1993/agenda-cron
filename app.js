var createError = require("http-errors");
var express = require("express");
var path = require("path");
var cookieParser = require("cookie-parser");
var logger = require("morgan");
var Agenda = require("agenda");
var Agendash = require("agendash");
const axios = require("axios");

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
  db: { address: "mongodb://localhost:27017/agenda" },
});

// Function to define a job with a given name and a given function
function defineJob(name, func) {
  agenda.define(name, async (job) => {
    console.log(`${name} executed`);
    await func();
  });
}

// Define jobs

// Define a sync service calls from SAP
defineJob("Get service calls from SAP", async () => {
  const url = "http://localhost:3001/api/v1/service-calls/sap/sync/";
  const response = await axios.get(url);
});

// Define job for sending service calls to mobile app
defineJob("Send service calls to mobile app", async () => {
  const url = "http://localhost:3001/api/v1/service-calls/mobile/sync/";
  const response = await axios.post(url);
});

// Define job for getting the service calls from the mobile app to the server
defineJob("Get service calls from mobile app", async () => {
  const url = "http://localhost:3001/api/v1/service-calls/server/sync/";
  const response = await axios.get(url);
});

// Define job for syncing technicians to mobile app
defineJob("Send technicians to mobile app", async () => {
  const url = "http://localhost:3001/api/v1/technicians/mobile/sync/100";
  const response = await axios.get(url);
});
// Define job for getting the tabulator data to the server
defineJob("Get tabulator data to server", async () => {
  const url = "http://localhost:3001/api/v1/tabulator/sync";
  const response = await axios.get(url);
});

// Define job for sending the tabulator data to mobile app
defineJob("Send tabulator data to mobile app", async () => {
  const url = "http://localhost:3001/api/v1/tabulator/mobile/sync/10000";
  const response = await axios.post(url);
});

// Define job for getting products to server
defineJob("Get products to server", async () => {
  const url = "http://localhost:3001/api/v1/products/sync/1000";
  const response = await axios.get(url);
});

// Define job for sending the products to mobile app
defineJob("Send products to mobile app", async () => {
  const url = "http://localhost:3001/api/v1/products/mobile/sync/";
  const response = await axios.get(url); // Review if change post ot get
});

// Start Agenda
(async function () {
  await agenda.start();
  await agenda.every("1 minute", "Get service calls from SAP");
  await agenda.every("5 minutes", "Send technicians to mobile app");
  agenda.on("success:Send technicians to mobile app", async (job) => {
    console.log(
      "Send technicians to mobile app job finished, now executing Send service calls to mobile app"
    );
    await agenda.now("Send service calls to mobile app");
  });
  await agenda.every("5 minutes", "Get service calls from mobile app");
  await agenda.every("2 hours", "Get products to server");
  await agenda.every("3 hours", "Send products to mobile app");
  await agenda.every("3 hours", "Get tabulator data to server");
  await agenda.every("4 hours", "Send tabulator data to mobile app");
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
