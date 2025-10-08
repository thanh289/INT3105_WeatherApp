import app from "./app";
import { config } from "dotenv";
config();

(() => {
  const PORT: number | string = process.env.PORT;
  app
    .listen(PORT, () => {
      console.log("##########################################################");
      console.log("#####               STARTING SERVER                  #####");
      console.log(
        "##########################################################\n"
      );
      console.log(`Server running → PORT ${PORT}`);
    })
    .on("error", (e) => {
      console.error(e);
    });
})();

// Above is a structure OF IIFE - An Immediately Invoked Function Expression, which executed immediately after it is defined. 
// It is a common pattern used to create a local scope for variables and functions, thereby preventing them from polluting the global scope. 
// For the above situation, it's fine not to use IIFE, just the coding style of the host


// [server.ts]
//    ↓
// start app.listen(PORT)
//    ↓
// [app.ts]
//    ↓
// Create Express app
//    ↓
// Import middleware (logger, cors, helmet, compression)
//    ↓
// Registry route (routes/index.ts → weatherRoute.ts)
//    ↓
// Connect MongoDB (connectDB.ts)
//    ↓
// Server listen request
//    ↓
// When having a request:
//      Middleware (logger, cors, ...)
//      → Router (routes)
//      → Controller (weatherController.ts)
//      → Service (weatherService.ts)
//      → DB (weatherModel.ts)
//    ↓
// If error → errorHandler / notFoundErrorHandler
//    ↓
// Response for client


