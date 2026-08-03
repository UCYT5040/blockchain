import { write, writeLine } from "@shared/term";
import { getRuntimeConfig, saveRuntimeConfig } from "./config";
import { SERVER_ADDRESS } from "@shared/const";

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

        // Save config
        saveRuntimeConfig({
            clientId,
            masterKey,
            serverAddress: SERVER_ADDRESS
        });

        writeLine(term, 'Saved to `/config.json`.');
    }
}

writeLine(term, 'Client has not been implemented yet.');

