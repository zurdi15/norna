// The API's bcrypt limit: bytes past 72 would be silently ignored.
export const PASSWORD_MIN_LENGTH = 8
export const PASSWORD_MAX_LENGTH = 72

/**
 * true when the password is acceptable, otherwise the translation key of the problem.
 * Login forms skip the length rules: existing passwords may predate them.
 */
export function validatePassword(password: string, checkLength = true): true | string {
	if (password === '') {
		return 'auth.passwordRules.required'
	}
	if (checkLength && password.length < PASSWORD_MIN_LENGTH) {
		return 'auth.passwordRules.tooShort'
	}
	if (checkLength && password.length > PASSWORD_MAX_LENGTH) {
		return 'auth.passwordRules.tooLong'
	}
	return true
}
