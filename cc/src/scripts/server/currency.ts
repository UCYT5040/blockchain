import { get, post } from './http';
import type {
	CurrencyListResponse,
	CurrencyActionResult,
	NewCurrencyRequest,
	AuthorizeCurrencyRequest,
	ProcessCurrencyRequest
} from '@common/currency';

export function listCurrency(clientId: string): CurrencyListResponse | null {
	const raw = get(`server/currency/list/${clientId}`);
	if (!raw) {
		print('[Currency] Failed to get currency');
		return null;
	}

	let currencyData: CurrencyListResponse | undefined;
	try {
		currencyData = textutils.unserialiseJSON(raw) as CurrencyListResponse;
	} catch {
		print('[Currency] Failed to parse JSON');
		return null;
	}

	return currencyData;
}

export function newCurrency(
	fromClientId: string,
	toClientId: string,
	amount: number,
	createdBy: string,
	note: string
): CurrencyActionResult | null {
	const payload: NewCurrencyRequest = {
		fromClientId,
		toClientId,
		amount,
		createdBy,
		note
	};
	const raw = post('server/currency/new', textutils.serialiseJSON(payload));
	if (!raw) {
		print('[Currency] Failed to create currency');
		return null;
	}

	let currencyData: CurrencyActionResult | undefined;
	try {
		currencyData = textutils.unserialiseJSON(raw) as CurrencyActionResult;
	} catch {
		print('[Currency] Failed to parse JSON');
		return null;
	}

	return currencyData;
}

export function authorizeCurrency(
	transactionId: string,
	clientId: string
): CurrencyActionResult | null {
	const payload: AuthorizeCurrencyRequest = { clientId };
	const raw = post(`server/currency/authorize/${transactionId}`, textutils.serialiseJSON(payload));
	if (!raw) {
		print('[Currency] Failed to authorize currency');
		return null;
	}

	let currencyData: CurrencyActionResult | undefined;
	try {
		currencyData = textutils.unserialiseJSON(raw) as CurrencyActionResult;
	} catch {
		print('[Currency] Failed to parse JSON');
		return null;
	}

	return currencyData;
}

export function processCurrency(
	transactionId: string,
	clientId: string
): CurrencyActionResult | null {
	const payload: ProcessCurrencyRequest = { clientId };
	const raw = post(`server/currency/process/${transactionId}`, textutils.serialiseJSON(payload));
	if (!raw) {
		print('[Currency] Failed to process currency');
		return null;
	}

	let currencyData: CurrencyActionResult | undefined;
	try {
		currencyData = textutils.unserialiseJSON(raw) as CurrencyActionResult;
	} catch {
		print('[Currency] Failed to parse JSON');
		return null;
	}

	return currencyData;
}
