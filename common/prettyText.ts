import { type ColorBlit, ColorBlits } from "./colors";

export interface PrettyTextComponent {
    text: string;
    textColor?: ColorBlit;
    backgroundColor?: ColorBlit;
}

export interface BlitData {
    text: string;
    textColor: string;
    backgroundColor: string;
}

export function createBlitData(components: PrettyTextComponent[], maxWidth: number = -1): BlitData[] {
    const lines: BlitData[] = [];
    let currentText = "";
    let currentTextColor = "";
    let currentBackgroundColor = "";

    const pushLine = () => {
        lines.push({
            text: currentText,
            textColor: currentTextColor,
            backgroundColor: currentBackgroundColor,
        });
        currentText = "";
        currentTextColor = "";
        currentBackgroundColor = "";
    };

    for (const component of components) {
        const textColorChar = component.textColor ?? ColorBlits.white;
        const backgroundColorChar = component.backgroundColor ?? ColorBlits.black;

        for (const char of component.text) {
            if (char === "\n") {
                pushLine();
            } else {
                if (maxWidth > 0 && currentText.length >= maxWidth) {
                    pushLine();
                }
                currentText += char;
                currentTextColor += textColorChar;
                currentBackgroundColor += backgroundColorChar;
            }
        }
    }

    if (currentText.length > 0 || lines.length > 0) {
        pushLine();
    }

    return lines;
}