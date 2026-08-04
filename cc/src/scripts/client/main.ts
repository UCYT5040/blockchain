import { write, writeLine } from "@shared/term";
import { getRuntimeConfig, saveRuntimeConfig } from "./config";
import { SERVER_ADDRESS } from "@shared/const";
import { ClientAPI } from "./api";
import { pretty_print } from "cc.pretty";
import { displayMOTD } from "@shared/motd";
import { BlitData } from "@common/prettyText";

const REGISTRATION_SITE = ''; // TODO: Add registration site

write(term, `You need to authenticate to communicate on this network.
(Press Enter to continue)`);

read();

// Attempt to retrieve config
let config = getRuntimeConfig();

if (!config) {
    write(term, `Config not found. You should register this computer.
It is generally recommended that you register each of your computers separately.
Visit ${REGISTRATION_SITE} to retrieve registration details.
(Enter a blank response to quit)
Enter your Client ID: `);

    const clientId = read();

    if (clientId !== '') {
        write(term, `Enter your Master Key: `);
        const masterKey = read('*');

        config = {
            clientId,
            masterKey,
            serverAddress: SERVER_ADDRESS
        }

        // Save config
        saveRuntimeConfig(config);

        writeLine(term, 'Saved to `/config.json`.');
    }
}

if (!config) throw new Error("Config not found. Please register this computer.");

// Try to send a request for contact data
const client = new ClientAPI(config.clientId, config.masterKey, config.serverAddress);

function main() {
    parallel.waitForAny(
        () => client.listen(),
        () => {
            let resData: unknown;
            let reqErr: unknown;
            let finished = false;

            client.request("motd:get")
                .then((res) => {
                    resData = res;
                    finished = true;
                })
                .catch((err) => {
                    reqErr = err;
                    finished = true;
                });

            while (!finished) {
                os.sleep(0.05);
            }

            if (reqErr) throw reqErr;

            const data = resData as { motd?: BlitData[] };

            displayMOTD(term, data.motd);
        }
    );
}

main();

sleep(10);
