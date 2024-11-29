const { exec } = require("child_process");


// Open a new terminal for the React client
exec(`start cmd /k "cd client && npm run dev"`, (err) => {
  if (err) console.error("Error starting client:", err.message);
});


// Open a new terminal for the Python server
exec(`start cmd /k "cd server && python server2.py"`, (err) => {
  if (err) console.error("Error starting server:", err.message);
});

