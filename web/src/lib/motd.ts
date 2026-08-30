// This file holds static MOTDs (Message of the Day). It could be improved to be dynamic.

import { createBlitData, type PrettyTextComponent } from '../../../common/prettyText';
import { ColorBlits } from '../../../common/colors';

/*
`small` - Shown on various computers when booted
`xlOne` - Shown at spawn on the left monitor
`xlTwo` - Shown at spawn on the right monitor
*/
export type MessageType = 'small' | 'xlOne' | 'xlTwo';

const small: PrettyTextComponent[] = [{ text: 'Welcome to the BlockChain' }];

const xlOne: PrettyTextComponent[] = [
	{ text: '\n \u0097\u0083\u0083\u0083\u0083\u0083\u0083\u0083\u0083\u0083\u0083' },
	{ text: '\u0094', textColor: ColorBlits.black, backgroundColor: ColorBlits.white },
	{ text: ' \n \u0095BlockChain' },
	{ text: '\u0095', textColor: ColorBlits.black, backgroundColor: ColorBlits.white },
	{ text: ' \n ' },
	{
		text: '\u008a\u008f\u008f\u008f\u008f\u008f\u008f\u008f\u008f\u008f\u008f\u0085',
		textColor: ColorBlits.black,
		backgroundColor: ColorBlits.white
	},
	{ text: '\n\n--------------\n Docs & more: \n--------------', textColor: ColorBlits.black, backgroundColor: ColorBlits.white },
	{ text: '\n\nhttps://blockchain-ysws.vercel.app/', textColor: ColorBlits.cyan },
	{ text: '\n\n\n-----------------\n Start building: \n-----------------', textColor: ColorBlits.black, backgroundColor: ColorBlits.white },
	{ text: '\n\n1. claim some land', textColor: ColorBlits.yellow },
	{ text: '\n2. connect to the internet', textColor: ColorBlits.yellow },
	{ text: '\n3. build something cool!', textColor: ColorBlits.yellow }
];

const xlTwo: PrettyTextComponent[] = [
	{ text: 'Claiming land', textColor: ColorBlits.yellow, backgroundColor: ColorBlits.blue },
	{ text: '\nPress the `\'` key to manage claims', textColor: ColorBlits.black, backgroundColor: ColorBlits.lightGray },
	{ text: '\nKeep your land safe by claiming it!', textColor: ColorBlits.black, backgroundColor: ColorBlits.lightGray },
	{ text: '\n\nThe internet', textColor: ColorBlits.yellow, backgroundColor: ColorBlits.blue },
	{ text: '\nAll computers have the `client` app', textColor: ColorBlits.black, backgroundColor: ColorBlits.lightGray },
	{ text: '\nUse it to register your computer', textColor: ColorBlits.black, backgroundColor: ColorBlits.lightGray },
	{ text: '\nYou must connect a wireless modem first', textColor: ColorBlits.black, backgroundColor: ColorBlits.lightGray },
	{ text: '\nIf out of range, try building a relay', textColor: ColorBlits.black, backgroundColor: ColorBlits.lightGray },
	{ text: '\n\nMore help available online', textColor: ColorBlits.white },
	{ text: '\nhttps://blockchain-ysws.vercel.app/', textColor: ColorBlits.cyan }
];

export const messagesOfTheDay = {
	xlOne: createBlitData(xlOne),
	xlTwo: createBlitData(xlTwo),
	small: createBlitData(small)
};
