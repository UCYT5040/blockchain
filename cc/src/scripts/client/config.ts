import * as crypto from 'crypto';
import { write } from '@shared/term';

export interface StoredClientConfig {
    clientId: string;
    masterKeyEncrypted: string;
    serverAddress: string;
    salt: string;
    iv: string;
    mac: string;
}

export interface RuntimeClientConfig extends Omit<StoredClientConfig, 'masterKeyEncrypted' | 'salt' | 'iv' | 'mac'> {
    masterKey: string;
    masterKeyEncrypted?: string;
    salt?: string;
    iv?: string;
    mac?: string;
}

export function loadConfig(): StoredClientConfig | null {
    if (!fs.exists('/config.json')) return null;

    const [file, reason] = fs.open('/config.json', 'r');
    if (!file) {
        error("Failed to open config file: " + reason);
    }

    const data = file.readAll();
    file.close();
    
    return textutils.unserialiseJSON(data) as StoredClientConfig;
}

export function saveConfig(config: StoredClientConfig): void {
    const [file, reason] = fs.open('/config.json', 'w');

    if (!file) {
        error("Failed to open config file: " + reason);
    }

    file.write(textutils.serialiseJSON(config));
    file.close();
}

function authenticate(terminal?: ITerminal): string {
    if (!terminal) {
        terminal = term;
    }

    terminal.clear();
    terminal.setCursorPos(1, 1);
    write(terminal, `Authentication
A password is necessary to read or save your stored key.
Warning: Only enter your password if you trust this program.
Password: `);
    
    const password = read("*");

    return password;
}

export function getRuntimeConfig(terminal?: ITerminal): RuntimeClientConfig | null {
    const storedConfig = loadConfig();

    if (!storedConfig) {
        return null;
    }

    const password = authenticate(terminal);

    const kek = crypto.deriveKey(password, storedConfig.salt);

    const expectedMac = crypto.blake2s(kek + storedConfig.iv + storedConfig.masterKeyEncrypted);
    if (!crypto.constantTimeCompare(expectedMac, storedConfig.mac)) {
        return null;
    }

    return {
        ...storedConfig,
        masterKey: crypto.decryptText(storedConfig.masterKeyEncrypted, kek, storedConfig.iv),
    } as RuntimeClientConfig;
}

export function saveRuntimeConfig(config: RuntimeClientConfig, terminal?: ITerminal): void {
    const salt = crypto.generateRandomHex(16);
    const iv = crypto.generateRandomHex(8);

    const password = authenticate(terminal);

    const kek = crypto.deriveKey(password, salt);

    const ciphertext = crypto.encryptText(config.masterKey, kek, iv);

    const mac = crypto.blake2s(kek + iv + ciphertext);

    const storedConfig: StoredClientConfig = {
        clientId: config.clientId,
        masterKeyEncrypted: ciphertext,
        serverAddress: config.serverAddress,
        salt,
        iv,
        mac
    };

    saveConfig(storedConfig);
}
