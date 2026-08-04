import { BlitData } from "@common/prettyText";

export function displayMOTD(terminal: ITerminal, motdData: BlitData[]) {
    terminal.clear();

    let cursorY = 1;
    for (const line of motdData) {
        terminal.setCursorPos(1, cursorY);
        terminal.blit(line.text, line.textColor, line.backgroundColor);
        cursorY += 1;
    }
}