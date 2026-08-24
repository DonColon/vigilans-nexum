export function promisifyTransaction(transaction: IDBTransaction): Promise<void> {
	return new Promise<void>((resolve, reject) => {
		const unlisten = () => {
			transaction.removeEventListener("complete", complete);
			transaction.removeEventListener("error", error);
			transaction.removeEventListener("abort", error);
		};

		const complete = () => {
			resolve();
			unlisten();
		};

		const error = () => {
			reject(transaction.error);
			unlisten();
		};

		transaction.addEventListener("complete", complete);
		transaction.addEventListener("error", error);
		transaction.addEventListener("abort", error);
	});
}

export function promisifyRequest<T>(request: IDBRequest<T>) {
	return new Promise<T>((resolve, reject) => {
		const unlisten = () => {
			request.removeEventListener("success", success);
			request.removeEventListener("error", error);
		};

		const success = () => {
			resolve(request.result);
			unlisten();
		};

		const error = () => {
			reject(request.error);
			unlisten();
		};

		request.addEventListener("success", success);
		request.addEventListener("error", error);
	});
}
