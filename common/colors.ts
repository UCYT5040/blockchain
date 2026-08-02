export const ColorBlits = {
    white: '0',
    orange: '1',
    magenta: '2',
    lightBlue: '3',
    yellow: '4',
    lime: '5',
    pink: '6',
    gray: '7',
    lightGray: '8',
    cyan: '9',
    purple: 'a',
    blue: 'b',
    brown: 'c',
    green: 'd',
    red: 'e',
    black: 'f',
} as const;

export type ColorBlit = typeof ColorBlits[keyof typeof ColorBlits];