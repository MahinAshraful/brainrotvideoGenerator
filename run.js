const { exec } = require("child_process");
const path = require("path");
const os = require("os");

const isWindows = os.platform() === "win32";

const commands = {
  client: {
    windows: `start cmd /k "cd client && npm run dev"`,
    mac: `osascript -e 'tell app "Terminal" to do script "cd ${path.resolve(
      __dirname,
      "client"
    )} && npm run dev"'`,
  },
  server: {
    windows: `start cmd /k "cd server && python server.py"`,
    mac: `osascript -e 'tell app "Terminal" to do script "cd ${path.resolve(
      __dirname,
      "server"
    )} && python3 server.py"'`,
  },
};

function executeCommand(command, name) {
  exec(command, (err) => {
    if (err) {
      console.error(`Error starting ${name}:`, err.message);
      if (!isWindows && err.message.includes("osascript")) {
        console.log(`
          Note: On macOS, you might need to grant Terminal permissions:
          1. Go to System Preferences > Security & Privacy > Privacy
          2. Select 'Automation' from the left sidebar
          3. Enable permissions for Terminal or iTerm2
        `);
      }
    } else {
      console.log(`Successfully started ${name}`);
    }
  });
}

function startApplications() {
  const platform = isWindows ? "windows" : "mac";

  executeCommand(commands.client[platform], "client");

  executeCommand(commands.server[platform], "server");
}

setTimeout(startApplications, 1000);
