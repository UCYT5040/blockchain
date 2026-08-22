export interface CurrencyRecordFields {
	'Transaction ID': string;
	Note?: string;
	From: string[];
	To: string[];
	Amount: number;
	'Needs Auth'?: boolean;
	Authorized?: boolean;
	Processed?: boolean;
	'Slack ID (from From)'?: string[];
	'Slack ID (from To)'?: string[];
	'Name (from From)'?: string[];
	'Name (from To)'?: string[];
	[key: string]: any;
}

export interface Currency {
	transactionId: string;
	note: string;
	fromId: string;
	toId: string;
	amount: number;
	needsAuth: boolean;
	authorized: boolean;
	processed: boolean;
}

export interface CurrencyListResponse {
	balance: number;
	transactions: CurrencyRecordFields[];
}

export interface NewCurrencyRequest {
	fromClientId: string;
	toClientId: string;
	amount: number;
	createdBy: string;
	note: string;
}

export interface AuthorizeCurrencyRequest {
	clientId: string;
}

export interface ProcessCurrencyRequest {
	clientId: string;
}

export type ProcessCurrencyResult =
	| {
			success: true;
	  }
	| {
			success: false;
			error: string;
	  };

export interface CurrencySuccessResponse {
	success: true;
}

export interface CurrencyErrorResponse {
	error: string;
}

export type CurrencyActionResult = ProcessCurrencyResult | CurrencyErrorResponse;
