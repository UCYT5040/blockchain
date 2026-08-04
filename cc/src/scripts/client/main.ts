import { write, writeLine } from "@shared/term";
import { getRuntimeConfig, saveRuntimeConfig } from "./config";
import { SERVER_ADDRESS } from "@shared/const";
import { ClientAPI } from "./api";
import { pretty_print } from "cc.pretty";
import { displayMOTD } from "@shared/motd";
import { BlitData } from "@common/prettyText";
import { initChatListener, openChatMenu } from "./chat";

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

if (!config) error("Config not found. Please register this computer.");

const client = new ClientAPI(config.clientId, config.masterKey, config.serverAddress);

// Initialize background P2P chat listener
initChatListener(client);

let motd: BlitData[] | null = null;
let motdLoaded = false;

function fetchMOTD(): void {
    client.request("motd:get")
        .then((res) => {
            const data = res as { motd?: BlitData[] };
            motd = data.motd || null;
            motdLoaded = true;
        })
        .catch(() => {
            motdLoaded = true;
        });
}

function mainUI(): void {
    fetchMOTD();

    while (!motdLoaded) {
        os.sleep(0.05);
    }

    menu();
}

function menu(): void {
    term.clear();
    term.setCursorPos(1, 1);
    if (motd) displayMOTD(term, motd);

    writeLine(term, '[1] Chats');
    writeLine(term, '[2] Exit');
    write(term, 'Select option: ');

    const selection = read();

    if (selection === '1') {
        openChatMenu(client);
        menu();
    } else if (selection === '2') {
        os.shutdown();
    } else {
        menu();
    }
}

parallel.waitForAll(
    () => client.listen(),
    mainUI
);

