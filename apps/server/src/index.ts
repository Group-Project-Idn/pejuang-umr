import { readServerConfig } from "./config";
import { createPejuangServer } from "./server";

const config = readServerConfig();
const { httpServer } = createPejuangServer(config);

httpServer.listen(config.port, () => {
  console.log(`Server di http://localhost:${config.port}`);
});
