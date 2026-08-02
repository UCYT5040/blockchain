// This file holds static MOTDs (Message of the Day). It could be improved to be dynamic.

import { createBlitData, type PrettyTextComponent } from "../../../common/prettyText";
import { ColorBlits } from "../../../common/colors";

/*
`small` - Shown on various computers when booted
`xlOne` - Shown at spawn on the left monitor
`xlTwo` - Shown at spawn on the right monitor
*/
export type MessageType = "small" | "xlOne" | "xlTwo";

const small: PrettyTextComponent[] = [
    { text: "Welcome to the BlockChain"}
]

const xlOne: PrettyTextComponent[] = [
    { text: "\u0097\u0083\u0083\u0083\u0083\u0083\u0083\u0083\u0083\u0083\u0083"},
    { text: "\u0094", textColor: ColorBlits.black, backgroundColor: ColorBlits.white },
    { text: "\n\u0095BlockChain"},
    { text: "\u0095\n\u008a\u008f\u008f\u008f\u008f\u008f\u008f\u008f\u008f\u008f\u008f\u0085", textColor: ColorBlits.black, backgroundColor: ColorBlits.white}
]

const xlTwo: PrettyTextComponent[] = [
    { text: "This is a test", textColor: ColorBlits.red, backgroundColor: ColorBlits.green }
]

export const messagesOfTheDay = {
    xlOne: createBlitData(xlOne),
    xlTwo: createBlitData(xlTwo),
    small: createBlitData(small),
}
