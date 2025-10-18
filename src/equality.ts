/**
 * 比较函数，用于确定两个值是否相等。
 */
export type ValueEqualsFn<T> = (a: NonNullable<T>, b: NonNullable<T>) => boolean;

let valueEqualsFn: ValueEqualsFn<{}> | undefined;

/**
 * 设置默认得必较函数
 */
export function setValueEqualsFn(fn: ValueEqualsFn<{}>): void {
	valueEqualsFn = fn;
}

export function checkValueEquals<T>(a: T, b: T, equalsFn: ValueEqualsFn<NonNullable<T>> | undefined = valueEqualsFn): boolean {
	if (Object.is(a, b)) {
		return true;
	}
	
	if (a != null && b != null && equalsFn) {
		return equalsFn(a, b);
	}
	
	return false;
}
